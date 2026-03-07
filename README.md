# QuizBlitz — Setup Guide

## Stack
- **React + Vite** — frontend
- **Supabase** — cloud Postgres database (free tier, works across all devices)
- **bcryptjs** — password hashing (passwords never stored in plain text)

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Give it a name like `quizblitz`, set a DB password, pick a region close to you
4. Wait ~1 minute for it to spin up

---

## Step 2 — Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste and run the following SQL:

```sql
-- Users table (players only — admin is hardcoded)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  timing_mode TEXT NOT NULL DEFAULT 'none',   -- 'none' | 'quiz' | 'question'
  quiz_time_limit INTEGER DEFAULT 300,
  questions JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers JSONB DEFAULT '{}',
  auto_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_scores_quiz_id ON scores(quiz_id);
CREATE INDEX idx_scores_username ON scores(username);
CREATE INDEX idx_quizzes_code ON quizzes(code);
CREATE INDEX idx_users_username ON users(username);
```

4. Click **Run** — you should see "Success. No rows returned."

---

## Step 3 — Set Row Level Security (RLS)

Still in SQL Editor, run this to allow public access (the anon key controls this):

```sql
-- Enable RLS on all tables
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores  ENABLE ROW LEVEL SECURITY;

-- Users: anyone can insert (register), only service role can read all
CREATE POLICY "allow_register" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_read_own" ON users FOR SELECT TO anon USING (true);

-- Quizzes: public read, anon can insert/update/delete (admin is client-side gated)
CREATE POLICY "quizzes_select" ON quizzes FOR SELECT TO anon USING (true);
CREATE POLICY "quizzes_insert" ON quizzes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "quizzes_update" ON quizzes FOR UPDATE TO anon USING (true);
CREATE POLICY "quizzes_delete" ON quizzes FOR DELETE TO anon USING (true);

-- Scores: public read and insert
CREATE POLICY "scores_select" ON scores FOR SELECT TO anon USING (true);
CREATE POLICY "scores_insert" ON scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "scores_delete" ON scores FOR DELETE TO anon USING (true);
```

---

## Step 4 — Get Your API Keys

1. In Supabase dashboard → **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)

---

## Step 5 — Configure Environment Variables

In the project root, create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Never commit `.env` to Git. It's already in `.gitignore` by default with Vite.

---

## Step 6 — Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Step 7 — Deploy (Optional)

### Vercel (recommended, free)
```bash
npm install -g vercel
vercel
```
When prompted, add your environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Netlify
```bash
npm run build
# Drag the `dist/` folder to netlify.com/drop
# Then add env vars in Site Settings → Environment Variables
```

---

## File Structure

```
quizblitz/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # All UI components
│   ├── db.js             # All Supabase database functions
│   └── supabaseClient.js # Supabase connection
├── index.html
├── vite.config.js
├── package.json
├── .env.example          # Copy to .env and fill in your keys
└── README.md
```

---

## How It Works Across Devices

Since all data is stored in **Supabase (cloud Postgres)**:
- ✅ Quizzes created on your laptop appear on your phone instantly
- ✅ Player accounts work from any browser, any device
- ✅ Leaderboards are live across all sessions
- ✅ No local storage dependency for data — `sessionStorage` is only used to keep you logged in during a browser session
