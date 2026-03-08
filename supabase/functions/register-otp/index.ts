// Supabase Edge Function: register-otp
// Validates uniqueness, generates 6-digit OTP, stores in DB, sends via Resend API
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
        const { email, username } = await req.json();

        if (!email || !username) {
            return new Response(JSON.stringify({ error: "Missing email or username" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Check for duplicate email
        const { data: existingEmail } = await supabase
            .from("users").select("id").eq("email", email).maybeSingle();
        if (existingEmail) {
            return new Response(
                JSON.stringify({ error: "An account with that email already exists. Please sign in." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        // Check for duplicate username
        const { data: existingUsername } = await supabase
            .from("users").select("id").eq("username", username).maybeSingle();
        if (existingUsername) {
            return new Response(
                JSON.stringify({ error: "That username is taken. Please choose another." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Store OTP in DB (upsert in case of resend)
        await supabase.from("otp_verifications").upsert(
            [{ email, otp, username, expires_at: expiresAt }],
            { onConflict: "email" },
        );

        // Send email via Resend API (no SMTP needed)
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "LogicBlitz <onboarding@resend.dev>",
                to: email,
                subject: "Your LogicBlitz verification code",
                html: `
          <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:2rem;background:#080812;color:#dde;border-radius:12px;">
            <h2 style="color:#e94560;font-size:1.5rem;margin-bottom:0.5rem;">⚡ LogicBlitz</h2>
            <p style="color:#aab;margin-bottom:1.5rem;">Here is your 6-digit verification code:</p>
            <div style="font-size:2.5rem;font-weight:800;letter-spacing:0.6rem;color:#e94560;background:rgba(233,69,96,0.1);border:1.5px solid rgba(233,69,96,0.3);border-radius:10px;padding:1rem;text-align:center;">${otp}</div>
            <p style="color:#556;font-size:0.8rem;margin-top:1.5rem;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
            }),
        });

        if (!emailRes.ok) {
            const errText = await emailRes.text();
            console.error("Resend error:", errText);
            return new Response(JSON.stringify({ error: "Failed to send email. Please try again." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("register-otp error:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
