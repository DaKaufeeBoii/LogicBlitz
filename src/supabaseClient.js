import { createClient } from "@supabase/supabase-js";

// 🔧 REPLACE THESE with your own values from https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
    "Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n" +
    "See README.md for setup instructions."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_ANON_KEY };
