/**
 * Database commands:
 *   npm run db:migrate   apply pending migrations
 *   npm run db:seed      load the sample cats (development only)
 */
import { loadSampleListings } from "../fixtures/sample-listings";
import { migrate } from "./migrate";
import { getDatabaseUrl } from "@/core/config";
import { connect } from "@/server/db";

async function main() {
  const command = process.argv[2];
  const db = connect(getDatabaseUrl());
  try {
    if (command === "migrate") {
      const applied = await migrate(db);
      console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Nothing to apply.");
    } else if (command === "seed") {
      await loadSampleListings(db);
      console.log("Sample cats loaded.");
    } else {
      throw new Error(`Unknown command "${command}". Use "migrate" or "seed".`);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
