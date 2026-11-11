/**
 * Runtime configuration, read from the environment in one place.
 *
 * Every value is server-side only. A missing value raises a ConfigError that
 * names it, so a misconfigured deployment reports what is wrong instead of
 * rendering as an empty deck.
 */

export class ConfigError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `Missing configuration: ${missing.join(", ")}. ` +
        "Set these in .env.local for local development, or in the hosting " +
        "provider's environment settings, then restart.",
    );
    this.name = "ConfigError";
    this.missing = missing;
  }
}

type Env = Record<string, string | undefined>;

function read<K extends string>(names: readonly K[], env: Env): Record<K, string> {
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length > 0) throw new ConfigError(missing);
  return Object.fromEntries(names.map((n) => [n, env[n]!.trim()])) as Record<K, string>;
}

const APP_VARS = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"] as const;
const COLLECTOR_VARS = [...APP_VARS, "ANTHROPIC_API_KEY"] as const;

export interface AppConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
}

export interface CollectorConfig extends AppConfig {
  anthropicApiKey: string;
}

/** Configuration the web app needs to read and write listings. */
export function getAppConfig(env: Env = process.env): AppConfig {
  const v = read(APP_VARS, env);
  return { supabaseUrl: v.SUPABASE_URL, supabaseSecretKey: v.SUPABASE_SECRET_KEY };
}

/** Configuration the collector needs: database access plus the scoring API. */
export function getCollectorConfig(env: Env = process.env): CollectorConfig {
  const v = read(COLLECTOR_VARS, env);
  return {
    supabaseUrl: v.SUPABASE_URL,
    supabaseSecretKey: v.SUPABASE_SECRET_KEY,
    anthropicApiKey: v.ANTHROPIC_API_KEY,
  };
}
