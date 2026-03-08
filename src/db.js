import { supabase, SUPABASE_ANON_KEY } from "./supabaseClient";

// ─── ADMIN (hardcoded — never in DB) ─────────────────────────────────────────
export const ADMIN = { id: "admin", username: "admin", role: "admin" };
const ADMIN_PASSWORD = "admin123";

// ─── AUTH ─────────────────────────────────────────────────────────────────────
//
// REGISTER: calls register-otp Edge Function → Resend sends 6-digit code
//           then verify-otp Edge Function confirms code, creates auth user.
// LOGIN:    signInWithPassword → instant, no OTP.
//
// Zero dependency on Supabase SMTP — email goes directly via Resend API.
// Anon key imported from supabaseClient (guaranteed non-null — client init validates it).
const fnOpts = (body) => ({
  body,
  headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
});

const fnError = async (error) => {
  // Extract the real body from the error context (FunctionsHttpError)
  if (error?.context) {
    try {
      const body = await error.context.json();
      return body?.message || body?.error || JSON.stringify(body);
    } catch { /* ignore */ }
  }
  return error?.message || "Unknown error";
};



/**
 * REGISTER step 1 — validate & send OTP via Edge Function → Resend
 */
export async function registerUser(username, email, _password) {
  username = username.trim();
  email = email.trim().toLowerCase();

  // supabase.functions.invoke() automatically attaches the correct auth headers
  const { data, error } = await supabase.functions.invoke("register-otp", fnOpts({ email, username }));
  if (error) return { error: await fnError(error) };
  return { error: data?.error || null };
}


/**
 * REGISTER step 2 — verify OTP via Edge Function → creates auth user
 */
export async function verifyRegistrationOtp(email, token, username, password) {
  const { data, error } = await supabase.functions.invoke("verify-otp", fnOpts({ email, otp: token, username, password }));
  if (error) return { data: null, error: await fnError(error) };
  if (data?.error) return { data: null, error: data.error };

  // Set the session returned by the Edge Function on the Supabase client
  if (data?.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return {
    data: { id: data.id, email: data.email, username: data.username, role: "player" },
    error: null,
  };
}

/**
 * LOGIN — existing player (email + password, no OTP)
 */
export async function loginUser(email, password) {
  email = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    return { data: null, error: error?.message || "Invalid email or password" };
  }

  const { data: row } = await supabase
    .from("users").select("username").eq("email", email).maybeSingle();

  return {
    data: { id: data.user.id, email, username: row?.username || email.split("@")[0], role: "player" },
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