import postgres from "postgres";
import { getDatabaseUrl } from "@/core/config";

/**
 * The smallest database surface the app needs. Production uses a Postgres
 * connection; tests use an in-process Postgres with the same SQL.
 */
export interface Db {
  /**
   * One parameterised statement.
   *
   * Pass JSON as a string and cast it `$n::text::jsonb`. A bare `$n::jsonb`
   * makes the Postgres driver encode the string a second time, which the
   * in-process test database does not do, so the two would disagree.
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** One or more statements without parameters (migrations). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export function connect(url: string): Db {
  const sql = postgres(url, {
    // Supabase's pooled connections do not support prepared statements.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
    async exec(text) {
      await sql.unsafe(text).simple();
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

const globalForDb = globalThis as { __catFinderDb?: Db };

/** Shared connection for the running app. Throws ConfigError if unconfigured. */
export function getDb(): Db {
  globalForDb.__catFinderDb ??= connect(getDatabaseUrl());
  return globalForDb.__catFinderDb;
}
