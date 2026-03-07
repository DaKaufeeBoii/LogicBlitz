import { supabase } from "./supabaseClient";
import bcrypt from "bcryptjs";

// ─── ADMIN (hardcoded, never stored in DB) ────────────────────────────────────
export const ADMIN = { id: "admin", username: "admin", role: "admin" };
const ADMIN_PASSWORD = "admin123";

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function loginUser(username, password) {
  if (username === ADMIN.username) {
    if (password === ADMIN_PASSWORD) return { data: ADMIN, error: null };
    return { data: null, error: "Invalid credentials" };
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return { data: null, error: "Invalid credentials" };

  const match = await bcrypt.compare(password, data.password_hash);
  if (!match) return { data: null, error: "Invalid credentials" };

  return { data: { id: data.id, username: data.username, role: "player" }, error: null };
}

export async function registerUser(username, password) {
  if (username === "admin") return { data: null, error: "Username taken" };

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) return { data: null, error: "Username already taken" };

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{ username, password_hash }])
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: { id: data.id, username: data.username, role: "player" }, error: null };
}

// ─── USERS (admin view) ───────────────────────────────────────────────────────

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, created_at")
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
  return data.map(s => ({
    ...parseScore(s),
    quizTitle: s.quizzes?.title,
  }));
}