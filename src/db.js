import { supabase } from "./supabaseClient";

// ─── ADMIN (hardcoded — never in DB) ─────────────────────────────────────────
export const ADMIN = { id: "admin", username: "admin", role: "admin" };
const ADMIN_PASSWORD = "admin123";

// ─── AUTH: Register (email+password+OTP) / Login (email+password, no OTP) ────
//
// How this works:
//   REGISTER: signInWithOtp → sends the reliable 6-digit code → after verify,
//             set password via updateUser so future logins use signInWithPassword.
//   LOGIN:    signInWithPassword → no OTP, instant access.

/**
 * REGISTER — new player
 * Sends the 6-digit OTP via signInWithOtp (same reliable mechanism as before).
 * Password is stored in sessionStorage temporarily; set after OTP is verified.
 */
export async function registerUser(username, email, password) {
  username = username.trim();
  email = email.trim().toLowerCase();

  // Check for duplicate username or email in the users table first
  const { data: existingEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingEmail) return { error: "An account with that email already exists. Please sign in." };

  const { data: existingUsername } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) return { error: "That username is taken. Please choose another." };

  // Use signInWithOtp — this reliably sends a 6-digit code to the inbox
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * VERIFY REGISTRATION OTP — confirms email, sets password, saves username
 */
export async function verifyRegistrationOtp(email, token, username, password) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data?.user) {
    // Try "magiclink" type as fallback for some Supabase configs
    if (token.length === 6) {
      const res2 = await supabase.auth.verifyOtp({ email, token, type: "magiclink" });
      if (res2.error || !res2.data?.user) {
        return { data: null, error: error?.message || "Invalid or expired code" };
      }
      data.user = res2.data.user;
    } else {
      return { data: null, error: error?.message || "Invalid or expired code" };
    }
  }

  const authUser = data.user;

  // Set the password so the player can log in with signInWithPassword in future
  if (password) {
    await supabase.auth.updateUser({ password });
  }

  // Save user record with chosen username
  await supabase.from("users").upsert([{
    id: authUser.id,
    username,
    email,
    password_hash: "",
  }], { onConflict: "email" });

  return {
    data: { id: authUser.id, email, username, role: "player" },
    error: null,
  };
}

/**
 * LOGIN — existing player (no OTP)
 */
export async function loginUser(email, password) {
  email = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    return { data: null, error: error?.message || "Invalid email or password" };
  }

  const authUser = data.user;

  // Look up username from the public users table
  const { data: row } = await supabase
    .from("users")
    .select("username")
    .eq("email", email)
    .maybeSingle();

  const username = row?.username || email.split("@")[0];

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