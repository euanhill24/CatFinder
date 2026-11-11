import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "@/server/db";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

/** Applies any migration files not yet recorded, in filename order. */
export async function migrate(db: Db, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
  const pending = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !done.has(f));

  for (const name of pending) {
    const sql = readFileSync(join(dir, name), "utf8");
    // The file name is from our own directory listing, so quoting it inline is safe.
    await db.exec(`begin;\n${sql}\ninsert into schema_migrations (name) values ('${name.replace(/'/g, "''")}');\ncommit;`);
  }
  return pending;
}
