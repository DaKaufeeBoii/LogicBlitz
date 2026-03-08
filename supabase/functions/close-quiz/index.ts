// Supabase Edge Function: close-quiz
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { quizId } = await req.json();

        if (!quizId) {
            return new Response(JSON.stringify({ error: "Missing quizId" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // 1. Mark the quiz as closed
        const { error: updateError } = await supabase
            .from("quizzes")
            .update({ status: "closed" })
            .eq("id", quizId);

        if (updateError) throw updateError;

        // 2. Fetch the quiz details
        const { data: quiz } = await supabase
            .from("quizzes")
            .select("title")
            .eq("id", quizId)
            .single();

        // 3. Fetch scores
        const { data: scores } = await supabase
            .from("scores")
            .select("username, score, total, time_taken")
            .eq("quiz_id", quizId);

        if (!scores || scores.length === 0) {
            return new Response(JSON.stringify({ data: { message: "Quiz closed. No players to email." } }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Group by user and find best attempt
        const userBest: Record<string, any> = {};
        for (const s of scores) {
            const currentPercentage = s.score / s.total;
            if (!userBest[s.username]) {
                userBest[s.username] = s;
                continue;
            }
            const best = userBest[s.username];
            const bestPercentage = best.score / best.total;

            if (currentPercentage > bestPercentage) {
                userBest[s.username] = s;
            } else if (currentPercentage === bestPercentage && s.time_taken < best.time_taken) {
                userBest[s.username] = s;
            }
        }

        const rankedUsers = Object.values(userBest).sort((a: any, b: any) => {
            const pA = a.score / a.total;
            const pB = b.score / b.total;
            if (pB !== pA) return pB - pA;
            return a.time_taken - b.time_taken;
        });

        const top5 = rankedUsers.slice(0, 5);
        const top5Usernames = top5.map(u => u.username);

        // Fetch emails for the top players
        const { data: userData } = await supabase
            .from("users")
            .select("username, email")
            .in("username", top5Usernames);

        const emailMap: Record<string, string> = {};
        userData?.forEach(u => { emailMap[u.username] = u.email; });

        // 4. Send Emails
        const gmailUser = Deno.env.get("GMAIL_USER");
        const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

        if (!gmailUser || !gmailPass) {
            return new Response(JSON.stringify({ error: "SMTP credentials missing." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmailUser, pass: gmailPass },
        });

        // Create the individual email promises
        const sendPromises = top5.map((player, index) => {
            const email = emailMap[player.username];
            if (!email) return Promise.resolve();

            const position = index + 1;
            const suffix = ["st", "nd", "rd"][((position + 90) % 100 - 10) % 10 - 1] || "th";

            const html = `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2.5rem;background:#080812;color:#dde;border-radius:12px;border:1px solid #1a1a2e">
                    <div style="text-align:center;margin-bottom:2rem">
                        <span style="font-size:2.5rem">🏆</span>
                        <h2 style="color:#e94560;font-size:1.8rem;margin:0.5rem 0 0 0;letter-spacing:0.05em">Congratulations!</h2>
                    </div>
                    <p>Hello <strong>${player.username}</strong>,</p>
                    <p>You placed <strong>${position}${suffix}</strong> in <strong>${quiz?.title || 'LogicBlitz'}</strong>!</p>
                    <div style="background:rgba(233,69,96,0.1);padding:1.25rem;text-align:center;border-radius:8px;">
                        <div style="font-size:2rem;color:#fff">${player.score} / ${player.total}</div>
                        <div style="color:#778">Time: ${player.time_taken}s</div>
                    </div>
                    <p style="text-align:center;margin-top:2rem">— The LogicBlitz Team ⚡</p>
                </div>`;

            return transporter.sendMail({
                from: `"LogicBlitz" <${gmailUser}>`,
                to: email,
                subject: `You've made it to Phase Two! 🏆 (${quiz?.title})`,
                html,
            });
        });

        await Promise.all(sendPromises);

        return new Response(JSON.stringify({
            data: { message: `Quiz closed and emails sent to top ${top5.length} players.` }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("close-quiz error:", e);
        return new Response(JSON.stringify({
            error: e instanceof Error ? e.message : "An unknown error occurred"
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});