// Supabase Edge Function: verify-otp
// Checks OTP against DB, creates auth user via Admin API, returns session
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, otp, username, password } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Validate OTP — check it exists and hasn't expired
        const { data: record } = await supabase
            .from("otp_verifications")
            .select("*")
            .eq("email", email)
            .eq("otp", otp)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle();

        if (!record) {
            return new Response(JSON.stringify({ data: null, error: "Invalid or expired code. Please try again." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create the Supabase auth user (admin bypasses email confirmation)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            return new Response(JSON.stringify({ data: null, error: authError.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Insert into public users table
        await supabase.from("users").insert([{
            id: authData.user.id,
            username: record.username,
            email,
            password_hash: "",
        }]);

        // Delete the used OTP
        await supabase.from("otp_verifications").delete().eq("email", email);

        // Sign in to create a session the client can use
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError || !signInData?.session) {
            // Account was created — just return user data (client will need to sign in)
            return new Response(JSON.stringify({
                data: { id: authData.user.id, email, username: record.username, role: "player", session: null },
                error: null,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
            data: {
                id: authData.user.id,
                email,
                username: record.username,
                role: "player",
                session: signInData.session,
            },
            error: null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
        console.error("verify-otp error:", e);
        return new Response(JSON.stringify({ data: null, error: e.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
