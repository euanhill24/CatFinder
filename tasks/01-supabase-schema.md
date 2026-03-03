# Task 01 — Supabase Schema + Seed Data

## Context

Nothing exists yet. A Supabase project has been created manually at supabase.com. The project URL and anon key are available. This task creates the database schema and seeds it with fake cat listings so the UI can be built and tested before any real scraping exists.

Read `ARCHITECTURE.md` for the full schema definition and environment variable names before starting.

## Prerequisites (done by human before running this task)

- [ ] Supabase account created at supabase.com
- [ ] New Supabase project created (any name, closest region to UK)
- [ ] Project URL and anon key copied (Settings → API in Supabase dashboard)
- [ ] Service role key copied (Settings → API → service_role)

## Your job

Create the following files:

### 1. `supabase/schema.sql`
The full `CREATE TABLE` statement for the `listings` table. Use the exact schema from `ARCHITECTURE.md`. Include:
- All columns with correct types
- `UNIQUE` constraint on `external_url`
- `default gen_random_uuid()` on `id`
- `default now()` on `ingested_at`

### 2. `supabase/seed.sql`
Five fake ragdoll cat listings with realistic data. These exist purely to test the UI — they will be deleted once real cats are flowing in.

Seed data requirements:
- Mix of locations: 2 Edinburgh, 1 Glasgow, 1 Newcastle, 1 London
- Mix of ages: include one kitten (under 6 months), one senior (6+ years), rest 1–4 years
- Mix of sexes: male and female
- All score fields populated with realistic values (not all 10s — vary them)
- `score_rationale` must be a valid JSON object with keys: `alone`, `friendly`, `vibe`, `distance`, `age`
- `decision` set to `null` for all (undecided)
- `source` alternating between `pets4homes` and `gumtree`
- `external_url` values must be unique (use fake URLs like `https://pets4homes.co.uk/fake/listing-001`)
- `photo_urls` should contain at least one public ragdoll cat image URL (use real Unsplash URLs so the UI has something to render)

### 3. `.env.example`
Template file listing all required environment variables with empty values and a comment describing each. Use the exact variable names from `ARCHITECTURE.md`.

### 4. `.gitignore`
Standard Next.js gitignore. Must include `.env.local`.

## How to apply the schema

The schema.sql is run manually in the Supabase SQL editor (not via a migration tool). Document this clearly in a comment at the top of schema.sql.

## Acceptance criteria

- [ ] `supabase/schema.sql` runs without errors in the Supabase SQL editor
- [ ] `supabase/seed.sql` inserts exactly 5 rows without errors
- [ ] Running `seed.sql` a second time fails gracefully (UNIQUE constraint on `external_url` prevents duplicates)
- [ ] All 5 rows visible in the Supabase table editor
- [ ] All score columns have numeric values between 0 and 10
- [ ] `score_rationale` is valid JSON with all 5 keys
- [ ] `.env.example` contains all 5 required variable names from `ARCHITECTURE.md`
- [ ] `.env.local` is listed in `.gitignore`

## Do not

- Create a Next.js app (that is Task 02)
- Set up any ORM or migration tool
- Add Row Level Security policies (not needed for this single-user app)
- Use placeholder photo URLs that will 404 — use real public image URLs
