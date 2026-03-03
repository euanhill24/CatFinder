# Task 10 — Pipeline Script

## Context

Tasks 07, 08, and 09 are complete. The enrichment module and both scrapers work in isolation. This task builds the orchestration script that wires them together into a single end-to-end pipeline: scrape → deduplicate → enrich → insert to Supabase.

Read `ARCHITECTURE.md` for the database schema and the Supabase environment variable names.

## Prerequisites

- [ ] Task 07 complete (enrichment module)
- [ ] Task 08 complete (Pets4Homes scraper)
- [ ] Task 09 complete (Gumtree scraper)
- [ ] All three working independently
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local`
- [ ] `npm install @supabase/supabase-js` (already installed from Task 02)

## Your job

### 1. Create `pipeline/supabase-server.js`

A server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (not the anon key). This is separate from `lib/supabase.ts` (which uses the anon key and is browser-safe). The pipeline needs the service role key to insert rows without auth context.

```js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
module.exports = supabase;
```

### 2. Create `pipeline/run.js`

The main orchestration script. Run with: `node pipeline/run.js`

**Flow:**

```
1. Run scrapePets4Homes()     → array of raw listings
2. Run scrapeGumtree()        → array of raw listings
3. Merge both arrays
4. For each listing:
   a. Check if external_url already exists in Supabase
   b. If exists → skip (log "Skipping duplicate: [url]")
   c. If new → call enrichListing(listing)
   d. Insert merged object (raw listing + enrichment result) to Supabase
5. Log summary: "Run complete. X new listings inserted, Y duplicates skipped, Z errors."
```

**Error handling:**
- If a scraper throws (entire scrape fails), log the error and continue with the other scraper's results
- If enrichment fails for a single listing, log the error and skip that listing — do not insert without scores
- If a Supabase insert fails, log the error and continue
- Never let one failure crash the entire run
- Exit with code 0 if the run completed (even if some listings were skipped)
- Exit with code 1 only if both scrapers failed entirely

**Logging:**
All log lines should be prefixed with a timestamp: `[2026-03-01 06:00:12]`

Example output:
```
[2026-03-01 06:00:01] Starting pipeline run...
[2026-03-01 06:00:03] Pets4Homes: 18 listings fetched
[2026-03-01 06:00:05] Gumtree: 12 listings fetched
[2026-03-01 06:00:05] 30 listings to process (22 new, 8 duplicates)
[2026-03-01 06:00:07] Enriching: Beautiful female ragdoll, Edinburgh...
[2026-03-01 06:00:09] Inserted: Beautiful female ragdoll, Edinburgh (score: 8.4)
...
[2026-03-01 06:00:45] Run complete. 22 inserted, 8 skipped, 0 errors.
```

### 3. Deduplication

Check for existing `external_url` values in bulk (one query) rather than one query per listing. This is faster and more efficient:

```js
// Fetch all existing URLs in one query
const { data: existing } = await supabase
  .from('listings')
  .select('external_url');

const existingUrls = new Set(existing.map(r => r.external_url));

// Then filter
const newListings = allListings.filter(l => !existingUrls.has(l.external_url));
```

## Acceptance criteria

- [ ] `node pipeline/run.js` completes without unhandled errors
- [ ] New listings appear in Supabase after running
- [ ] All score fields are populated on inserted rows (no nulls on score columns)
- [ ] Running the script a second time immediately after: 0 new listings inserted, all previous ones counted as duplicates
- [ ] A failed individual enrichment does not stop remaining listings from being processed
- [ ] Log output includes timestamps and a final summary line
- [ ] Script exits with code 0 on successful completion
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is used for inserts (not the anon key)

## Do not

- Use the browser Supabase client (`lib/supabase.ts`) — create a separate server client
- Insert listings without scores (always enrich before inserting)
- Commit any credentials or API keys
- Add any web server or HTTP listener — this is a pure script
