# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Kitty Tinder" — a mobile-first swipe UI for browsing ragdoll cat listings. Single user, no auth, temporary app. See `PRD.md` for product requirements and `ARCHITECTURE.md` for full technical reference (schema, env vars, API shapes, scoring weights).

## Commands

All commands run from `temp-next-app/` (the Next.js app directory):

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + typescript)
```

Pipeline (from project root, once built):
```bash
node pipeline/run.js   # Scrape → enrich → insert (requires .env.local)
```

## Architecture

**Two independent systems share one Supabase table (`listings`):**

1. **Frontend** (Next.js 16 App Router + Tailwind v4 + TypeScript) — reads/updates `listings` via Supabase anon key. Two routes: `/` (swipe cards sorted by score) and `/liked` (right-swiped cats).

2. **Pipeline** (Node.js scripts in `pipeline/`) — runs on GitHub Actions cron every 4h. Scrapers (`fetch` + Cheerio) pull from Pets4Homes and Gumtree, Claude API scores each listing, results inserted via Supabase service role key. See "Pipeline Reliability" in `ARCHITECTURE.md` for the preflight/retry/caching behaviour.

**Data flow:** Scrapers → `pipeline/enrich.js` (Claude API scoring) → Supabase `listings` table → Frontend reads undecided listings sorted by `score_overall` DESC → user swipes → `decision` column updated.

**Scoring:** Five sub-scores (0–10) weighted into `score_overall`. Weights: alone 35%, friendly 20%, vibe 15%, distance 15%, age 15%. The enrichment module calculates `score_overall` — not Claude.

## Key Conventions

- **UI-first build order:** Tasks 01–06 build the frontend against seed data. Tasks 07–11 build the pipeline. See `tasks/README.md` for the dependency chain.
- **No auth/RLS:** Single-user personal tool. Anon key gives full read/write to `listings`.
- **No AI branding:** Scores displayed as plain attributes, never labelled "AI summary" or similar.
- **Path alias:** `@/*` maps to project root in TypeScript imports.
- **Env vars:** Copy `.env.example` to **two** places — `.env.local` at the repo root (pipeline) and `temp-next-app/.env.local` (frontend). Next.js only reads env files from its own project directory, so a root-only copy leaves the app with no credentials. Frontend uses `NEXT_PUBLIC_*` vars only; pipeline uses `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. `NEXT_PUBLIC_*` values are inlined at build time — changing them in Vercel needs a redeploy.
- **Fail loudly:** A database read that fails must never render as an empty state. `getSupabase()` throws `ConfigError` on missing env vars, and every caller shows `ErrorState` with the real message. Silent `.catch(console.error)` in a data path is a bug.
- **Database changes:** Run SQL directly in Supabase SQL Editor — no migration tooling.
- **Deduplication:** `external_url` is the unique key for listings. Existing rows are never rewritten (`upsert` with `ignoreDuplicates`), so a swipe decision is safe from re-scrapes.
- **Sold listings:** Inferred from absence, not detected. The pipeline refreshes `last_seen_at` for every URL it sees; the swipe deck hides anything unseen for `STALE_AFTER_DAYS` (7). Saved cats are badged "No longer listed" rather than hidden. See "Sold and Stale Listings" in `ARCHITECTURE.md`.
