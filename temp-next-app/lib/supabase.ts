import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConfigError } from "./errors";

let _supabase: SupabaseClient | null = null;

const SETUP_HINT =
  "Set them on the Vercel project and redeploy (NEXT_PUBLIC_* values are baked " +
  "into the browser bundle at build time, so saving them alone changes nothing), " +
  "or add them to temp-next-app/.env.local for local development.";

/**
 * Returns the shared browser Supabase client.
 *
 * Both variables are read as full static `process.env.NEXT_PUBLIC_*`
 * expressions because that is the only form Next.js inlines into the client
 * bundle — a dynamic lookup like `process.env[name]` would always be
 * undefined in the browser.
 *
 * @throws {ConfigError} If either variable is missing or the URL is malformed.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing ${missing.join(" and ")}. This build cannot reach the database. ${SETUP_HINT}`
    );
  }

  try {
    new URL(url!);
  } catch {
    throw new ConfigError(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}". ` +
        "It should look like https://<project-ref>.supabase.co"
    );
  }

  _supabase = createClient(url!, anonKey!);
  return _supabase;
}
