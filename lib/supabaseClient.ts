import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = [
  ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
  ["SUPABASE_SERVICE_ROLE_KEY", supabaseServiceKey],
].filter(([, value]) => !value);

if (missingEnv.length > 0) {
  console.warn(
    `Supabase env vars are missing: ${missingEnv
      .map(([name]) => name)
      .join(", ")}. Add them to .env.local or your Vercel project settings.`,
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
