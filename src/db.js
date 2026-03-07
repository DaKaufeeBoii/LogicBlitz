import { supabase } from "./supabaseClient";

// ─── ADMIN (hardcoded — never in DB) ─────────────────────────────────────────
export const ADMIN = { id: "admin", username: "admin", role: "admin" };
const ADMIN_PASSWORD = "admin123";

// ─── AUTH: OTP via Supabase Auth ─────────────────────────────────────────────
//
// Flow:
//   1. sendOtp(email)          → supabase.auth.signInWithOtp  → sends 6-digit code
//   2. verifyOtp(email, token) → supabase.auth.verifyOtp      → returns session
//      After verify, we upsert the email into public `users` table so admin
//      can see all registered players.
//
// Supabase setup required in dashboard:
//   Authentication → Providers → Email → set "Confirm email" to OTP (not magic link)
//   Run this SQL migration once:
//     ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
//     ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
//     ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT '';

export async function sendOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data?.user) {
    return { data: null, error: error?.message || "Invalid or expired code" };
  }

  const authUser = data.user;

  // Upsert into public users table — admin sees all players here
  const { data: existing } = await supabase
    .from("users")
    .select("id, username, email")
    .eq("email", email)
    .maybeSingle();

  let username;
  if (!existing) {
    // Derive a username from the email prefix
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
    // Check if that username is already taken
    const { data: taken } = await supabase
      .from("users")
      .select("id")
      .eq("username", base)
      .maybeSingle();

    username = taken ? `${base}${Math.floor(1000 + Math.random() * 9000)}` : base;

    await supabase.from("users").upsert([{
      id: authUser.id,
      username,
      email,
      password_hash: "",
    }], { onConflict: "email" });
  } else {
    username = existing.username;
  }

  return {
    data: { id: authUser.id, email, username, role: "player" },
    error: null,
  };
}

export async function adminLogin(password) {
  if (password === ADMIN_PASSWORD) return { data: { ...ADMIN, role: "admin" }, error: null };
  return { data: null, error: "Invalid admin password" };
}

export async function logoutUser() {
  await supabase.auth.signOut();
}

// ─── USERS (admin view) ───────────────────────────────────────────────────────

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, created_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}

// ─── QUIZZES ──────────────────────────────────────────────────────────────────

const parseQuiz = (q) => ({
  ...q,
  timingMode: q.timing_mode,
  quizTimeLimit: q.quiz_time_limit,
  allowReattempts: q.allow_reattempts ?? true,
  questions: typeof q.questions === "string" ? JSON.parse(q.questions) : q.questions,
});

export async function getQuizzes() {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data.map(parseQuiz);
}

export async function getQuizByCode(code) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("status", "active")
    .single();
  if (error || !data) return null;
  return parseQuiz(data);
}

export async function createQuiz(quiz) {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  const { data, error } = await supabase
    .from("quizzes")
    .insert([{
      title: quiz.title,
      code,
      timing_mode: quiz.timingMode,
      quiz_time_limit: quiz.quizTimeLimit,
      questions: JSON.stringify(quiz.questions),
      allow_reattempts: quiz.allowReattempts ?? true,
      status: "active",
    }])
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: parseQuiz(data), error: null };
}

export async function updateQuiz(id, quiz) {
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      title: quiz.title,
      timing_mode: quiz.timingMode,
      quiz_time_limit: quiz.quizTimeLimit,
      questions: JSON.stringify(quiz.questions),
      allow_reattempts: quiz.allowReattempts ?? true,
      status: quiz.status,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: parseQuiz(data), error: null };
}

export async function deleteQuiz(id) {
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) return { error: error.message };
  await supabase.from("scores").delete().eq("quiz_id", id);
  return { error: null };
}

export async function toggleQuizStatus(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "closed" : "active";
  const { error } = await supabase
    .from("quizzes")
    .update({ status: newStatus })
    .eq("id", id);
  return { error: error?.message || null, newStatus };
}

// ─── SCORES ───────────────────────────────────────────────────────────────────

const parseScore = (s) => ({
  ...s,
  quizId: s.quiz_id,
  autoSubmitted: s.auto_submitted,
  timestamp: new Date(s.created_at).getTime(),
  answers: typeof s.answers === "string" ? JSON.parse(s.answers) : s.answers,
});

export async function hasAttempted(quizId, username) {
  const { data, error } = await supabase
    .from("scores")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("username", username)
    .limit(1);
  if (error) return false;
  return data.length > 0;
}

export async function submitScore({ quizId, username, score, total, answers, autoSubmitted }) {
  const { data, error } = await supabase
    .from("scores")
    .insert([{
      quiz_id: quizId,
      username,
      score,
      total,
      answers: JSON.stringify(answers),
      auto_submitted: autoSubmitted,
    }])
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getScores() {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data.map(parseScore);
}

export async function getScoresByQuiz(quizId) {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("quiz_id", quizId)
    .order("score", { ascending: false });
  if (error) return [];
  return data.map(parseScore);
}

export async function getScoresByUser(username) {
  const { data, error } = await supabase
    .from("scores")
    .select("*, quizzes(title)")
    .eq("username", username)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data.map(s => ({ ...parseScore(s), quizTitle: s.quizzes?.title }));
}