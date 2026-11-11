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

/** Postgres connection string. All the web app needs. */
export function getDatabaseUrl(env: Env = process.env): string {
  return read(["DATABASE_URL"], env).DATABASE_URL;
}

export interface CollectorConfig {
  databaseUrl: string;
  anthropicApiKey: string;
}

/** Configuration the collector needs: database access plus the scoring API. */
export function getCollectorConfig(env: Env = process.env): CollectorConfig {
  const v = read(["DATABASE_URL", "ANTHROPIC_API_KEY"], env);
  return { databaseUrl: v.DATABASE_URL, anthropicApiKey: v.ANTHROPIC_API_KEY };
}
