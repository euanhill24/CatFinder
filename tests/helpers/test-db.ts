import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../../db/migrate";
import type { Db } from "@/server/db";

/** A fresh in-process Postgres with the real schema applied. No network needed. */
export async function createTestDb(): Promise<Db> {
  const pg = new PGlite();
  const db: Db = {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await pg.query<T>(sql, params)).rows;
    },
    async exec(sql) {
      await pg.exec(sql);
    },
    close: () => pg.close(),
  };
  await migrate(db);
  return db;
}
