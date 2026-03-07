const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "quizblitz.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'player',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    code            TEXT UNIQUE NOT NULL,
    timing_mode     TEXT NOT NULL DEFAULT 'none',
    quiz_time_limit INTEGER NOT NULL DEFAULT 300,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id            TEXT PRIMARY KEY,
    quiz_id       TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    text          TEXT NOT NULL,
    options       TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    time_limit    INTEGER NOT NULL DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS scores (
    id             TEXT PRIMARY KEY,
    quiz_id        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    username       TEXT NOT NULL,
    score          INTEGER NOT NULL,
    total          INTEGER NOT NULL,
    answers        TEXT NOT NULL,
    auto_submitted INTEGER NOT NULL DEFAULT 0,
    timestamp      INTEGER NOT NULL
  );
`);

module.exports = db;
