import { supabase } from "./supabaseClient";

// ─── ADMIN (hardcoded — never in DB) ─────────────────────────────────────────
export const ADMIN = { id: "admin", username: "admin", role: "admin" };
const ADMIN_PASSWORD = "admin123";

// ─── AUTH: OTP via Supabase Auth ─────────────────────────────────────────────
//
// Supabase setup required:
//   Authentication → Providers → Email → disable "Confirm email" magic link
//   Run this SQL once:
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
  const { data: authData, error: authError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (authError || !authData?.user) {
    return { data: null, error: authError?.message || "Invalid or expired code" };
  }

  const authUser = authData.user;

  // Check if this email is already registered in our public users table
  const { data: existing } = await supabase
    .from("users")
    .select("id, username, email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Returning user — just return their stored profile
    return {
      data: { id: authUser.id, email, username: existing.username, role: "player" },
      error: null,
    };
  }

  // New user — derive a username from email prefix
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";

  const { data: takenRow } = await supabase
    .from("users")
    .select("id")
    .eq("username", base)
    .maybeSingle();

  const newUsername = takenRow
    ? `${base}${Math.floor(1000 + Math.random() * 9000)}`
    : base;

  await supabase.from("users").upsert([{
    id: authUser.id,
    username: newUsername,
    email,
    password_hash: "",
  }], { onConflict: "email" });

  return {
    data: { id: authUser.id, email, username: newUsername, role: "player" },
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