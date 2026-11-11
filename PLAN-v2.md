# Delivery Plan — Cat Finder v2

Plan for building the product described in `PRD-v2.md`. Requirement IDs (`R-xx`, `N-xx`) refer to that document.

## 1. Decisions already made

| Decision | Choice |
|---|---|
| Relationship to v1 code | **Fully clean slate.** Nothing is carried over. v1 code is deleted on the v2 branch. |
| Existing data | **Start fresh.** No listings or decisions are migrated. |
| Scope | **Everything** in PRD-v2: Must, Should and Could. |
| Stack | **Option A** from §2: Next.js on Vercel, Supabase, GitHub Actions, with server-side data access only. |
| Database | Postgres, reached over a plain connection string (`DATABASE_URL`). A new Supabase project was the choice, but the free plan's two-project limit is already used, so where it is hosted is **open again**. |
| Branch | `v2` |
| Password on the app URL | **No.** The URL is unlisted and kept out of search engines, but not password protected. |

Consequence of starting fresh: any cat she has already swiped on that is still listed will appear once more in v2.

## 2. Stack options

Every option needs four things: somewhere to host the app, a database, a scheduled job that can run for several minutes, and a scoring API.

| | A. Next.js + Supabase + GitHub Actions | B. Next.js + Neon + GitHub Actions | C. Cloudflare (Workers + D1 + Cron) |
|---|---|---|---|
| App hosting | Vercel (free) | Vercel (free) | Cloudflare Pages/Workers (free) |
| Database | Supabase Postgres (free) | Neon Postgres via Vercel (free) | D1 SQLite (free) |
| Scheduler | GitHub Actions cron | GitHub Actions cron | Cloudflare Cron Triggers |
| Accounts needed | None new | Neon | Cloudflare |
| Database pauses when idle | Yes, after about a week with no activity. The 4-hourly run keeps it awake while collection is healthy | No. It sleeps and wakes on demand | No |
| Long scrape (several minutes) | Fine | Fine | Awkward. Worker time limits mean splitting the run into small steps |
| Main risk | If collection breaks for a week, the database pauses too | One more service to set up | Most new ground. Scraping from Workers is the least proven part |

Vercel's own scheduler is not an option on the free plan: it runs at most once a day and can't run a multi-minute job.

**Recommendation: A**, with one change from v1: the browser never talks to the database. All reads and writes go through the app's server, so no database key reaches the phone (N-07) and there is one set of configuration (N-09). The pausing risk is covered by the "collection is stale" banner (R-82) and a specific "database is paused" error in the collector (§10 of the PRD).

Other choices under option A:

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript for the app and the collector | One set of shared types and rules |
| Layout | One package at the repo root | Removes `temp-next-app/` and the two-env-file trap |
| Swipe gestures | Own implementation on pointer events with a small animation library | v1's swipe library caused the tap-versus-swipe and layering bugs (R-44) |
| Scraping | Plain HTTP fetch and HTML parsing first; headless browser only if a site needs it | Decided by a spike in milestone 5, against the live sites |
| Scoring | Claude API, small fast model, structured output | Photos are downloaded by the collector and sent as image data, which avoids the Gumtree photo block (R-24) |
| "New since last visit" | Stored on the phone | One user, one device (R-47) |
| Database changes | Versioned migration files in the repo | Replaces pasting SQL by hand |

## 3. Branching and cut-over

- Build on a new branch, proposed name **`v2`**, created from `main`. This plan and `PRD-v2.md` move with it.
- `main` and the live v1 app stay untouched until cut-over. The v1 scheduled run keeps working.
- v2 gets its **own Vercel project** pointing at the `v2` branch, so she can test on a real URL without disturbing v1.
- v2 gets **new database tables** (decision D2 below: same Supabase project or a new one).
- GitHub only runs scheduled workflows from the default branch. Until cut-over, the collector is run by hand; the 4-hourly schedule starts when `v2` merges to `main`.
- Cut-over: merge `v2` to `main`, point the main URL at the v2 project, confirm one scheduled run succeeds, then remove v1's table and Vercel project. Removing v1's data is a separate step that needs your go-ahead.

## 4. Repository shape

```
src/
  app/          screens: deck, saved list, detail view, error/empty/offline states
  server/       data access and actions (the only code that touches the database)
  core/         shared rules: types, score weights, age cut-off, stale window, dedup
  collector/    sources/ (one module per site), scoring, run orchestration
db/migrations/  schema as versioned SQL
fixtures/       saved HTML pages and sample listings for tests
tests/
.github/workflows/  collect.yml (cron), ci.yml (lint, typecheck, tests, build)
```

`core/` is where single-definition rules live: weights (R-22), the kitten cut-off (R-33) and the 7-day window (R-61) are each defined once and used by both the app and the collector.

Data: `listings`, `collection_runs`, and the fields in PRD §8. Row-level security on, with no public access.

## 5. Milestones

**Progress:** milestones 1–2 done. Next: milestone 3.

Each milestone ends with something that can be checked. UI comes first, on sample data, so the feel can be tested on her phone before any scraping exists.

### Phase 1 — Usable app on sample data

| # | Milestone | Covers | Done when |
|---|---|---|---|
| 1 | **Foundation.** Remove v1 code, scaffold the app at the repo root, design tokens from `DESIGN.md`, CI, config validation that names missing values | N-09, N-10 | CI is green; starting with missing config prints which values are missing |
| 2 | **Data layer.** Schema migrations, server data access, sample data covering awkward cases (sold, too young, no photo, very long description, duplicate pair) | PRD §8, R-30–R-34 | Tests show the deck query returns the right cats in the right order |
| 3 | **Shell and status.** Installable app, header, loading, error, empty and offline states, "last checked" time | R-80, R-81, R-90, R-91 | With the database unreachable the app shows the real error, never "all caught up" |
| 4 | **Swipe deck.** Card, drag with tilt and overlay, buttons, tap to open, saved decisions, failed-save message, new-since-last-visit count, undo | R-40–R-49 | Browser tests pass at 360px and 390px; swipe and tap both work on touch emulation |
| 5 | **Detail view and saved list.** Gallery, description, scores with reasons, original advert link, saved list with status badge, remove, notes | R-50–R-56, R-70–R-75 | Like → appears in saved list; gone cats are badged, not hidden |
| 6 | **Deploy and phone test.** v2 Vercel project, no search indexing | N-01, N-02, N-06 | She tries it on her phone with sample cats. Feedback is fixed before Phase 2 |

### Phase 2 — Real cats

| # | Milestone | Covers | Done when |
|---|---|---|---|
| 7 | **Scraping spike.** Check both live sites: what a plain fetch returns, how pagination works, whether sold/reserved is shown, how photos are served | PRD §10, R-63 | A short written finding picks the scraping method per site |
| 8 | **Source collectors.** One module per site, full pagination, non-ragdoll filtering, saved-page tests | R-01–R-07 | Each returns real listings, including ones past page 5; parser tests run offline |
| 9 | **Scoring.** Photo download, structured scoring, validation, retry, text-only fallback, red flags, computed overall | R-20–R-27 | Fixed test listings: Edinburgh beats Brighton, adult beats kitten, no-photo listing still scores |
| 10 | **Collection run.** Preflight → collect → mark seen → dedup → score → store → run summary; held-back listings retried next run; resumable after a scoring failure | R-10, R-11, R-60–R-62, R-83, R-84, N-05, N-08 | Two runs in a row create no duplicates; a simulated failed run hides nothing; zero results from a site is flagged |
| 11 | **Cross-site duplicates.** Match re-posts and same cat on both sites using advert details and photo similarity; keep links to every original | R-12, R-13 | The sample duplicate pair produces one card; a decided cat's re-post never reaches the deck |
| 12 | **Schedule and status banner.** 4-hourly workflow, stale-collection banner | R-02, R-82 | Workflow runs by hand end to end; banner appears when the last good run is over 24h old |

### Phase 3 — Launch

| # | Milestone | Done when |
|---|---|---|
| 13 | **Acceptance pass.** Work through the PRD §9 checklist against real data, on a real iPhone and Android phone | Every box is ticked or has a written exception you've agreed |
| 14 | **Cut-over.** Merge to `main`, switch the URL, first scheduled run green, sample data removed, docs rewritten (`README`, `CLAUDE.md`, `ARCHITECTURE.md`), v1 retired | She is using v2 at the usual address |

## 6. Risks

| Risk | Mitigation |
|---|---|
| A site blocks or changes its pages | Spike first (milestone 7); parsers tested on saved pages; zero results flagged loudly (R-84); headless-browser fallback |
| Duplicate matching merges two different cats | Conservative matching: only merge on strong agreement. A missed duplicate costs one extra swipe; a wrong merge hides a cat |
| Custom swipe feels worse than a library | It is the first thing tested on her phone (milestone 6), before the pipeline is built |
| Rebuilding from scratch repeats v1's mistakes | PRD §11 lists each one against a requirement; milestone 13 checks them all |
| Scoring cost | Small model, one call per new listing, hard spending cap (N-04) |

## 7. What I need from you

**Things only you can do**

- Add the v2 secrets (database keys, Claude API key) to Vercel and GitHub when milestone 6 and 12 are reached. I'll list the exact names.
- Get her to try the sample-data build on her phone at milestone 6.
- Approve removing v1's data and project at cut-over.
