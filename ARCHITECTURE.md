# Architecture Reference
## Cat Finder — "Kitty Tinder"

This document is a technical reference for developers executing task files. It describes the stack, environment variables, data shapes, and scoring logic. Read this before starting any task.

---

## Project Structure

```
cat-finder/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Main swipe interface (/)
│   ├── liked/
│   │   └── page.tsx            # Liked cats list (/liked)
│   └── layout.tsx
├── components/
│   ├── CatCard.tsx             # Swipe card component
│   ├── ScoreBar.tsx            # Score visualisation bar
│   └── LikedListItem.tsx       # Row in liked list
├── lib/
│   ├── supabase.ts             # Supabase client (browser)
│   ├── listings.ts             # Fetch undecided listings
│   └── decisions.ts            # Record swipe decisions
├── pipeline/
│   ├── run.js                  # Orchestration script (preflight → scrape → enrich → insert)
│   ├── enrich.js               # Claude API enrichment module
│   ├── env.js                  # Env loading + required-variable validation
│   ├── net.js                  # Network error unwrapping + retry with backoff
│   ├── supabase-server.js      # Service-role client + connection preflight
│   └── scrapers/
│       ├── fetch-page.js       # HTML fetch with timeout + retry, parsed by cheerio
│       ├── pets4homes.js       # Pets4Homes scraper
│       └── gumtree.js          # Gumtree scraper
├── supabase/
│   ├── schema.sql              # Full table definition
│   └── seed.sql                # 5 fake cat listings for UI testing
├── .github/
│   └── workflows/
│       └── scrape.yml          # Cron pipeline trigger
├── public/
│   └── manifest.json           # PWA manifest
├── .env.example                # Template — copy to .env.local
└── PRD.md                      # Product requirements
```

---

## Environment Variables

All variables must be present in `.env.local` for local development and in Vercel / GitHub Actions secrets for production.

| Variable | Used by | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend + pipeline | Supabase project URL. Format: `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend only | Supabase anon/public key. Safe to expose in browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Pipeline only | Supabase service role key. Never expose in browser. Used by pipeline to bypass RLS. |
| `ANTHROPIC_API_KEY` | Pipeline only | Claude API key from console.anthropic.com. Never expose in browser. |

`.env.example` should contain all keys with empty values. `.env.local` is gitignored.

---

## Database Schema

Single table: `listings`

```sql
create table listings (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,              -- 'pets4homes' | 'gumtree'
  external_url    text not null unique,       -- deduplication key
  title           text,
  price           integer,                    -- pence, nullable
  age_months      integer,                    -- nullable
  age_source      text,                       -- 'attribute' | 'title' | 'description' | null
  sex             text,                       -- 'male' | 'female' | 'unknown'
  location_raw    text,                       -- as listed on source site
  description     text,
  photo_urls      text[],                     -- array of image URLs
  listed_at       timestamptz,                -- when listed on source site
  ingested_at     timestamptz default now(),  -- when pipeline picked it up
  score_alone     numeric,                    -- 0–10
  score_friendly  numeric,                    -- 0–10
  score_vibe      numeric,                    -- 0–10
  score_distance  numeric,                    -- 0–10
  score_age       numeric,                    -- 0–10
  score_overall   numeric,                    -- 0–10, weighted composite
  score_rationale jsonb,                      -- { alone, friendly, vibe, distance, age }
  decision        text,                       -- null | 'liked' | 'dismissed'
  decided_at      timestamptz                 -- nullable
);
```

---

## Scoring Algorithm

### Weights

```
Alone Friendliness  →  35%
Friendliness        →  20%
Vibe                →  15%
Distance            →  15%
Age Suitability     →  15%
```

### Formula

```
score_overall = (
  score_alone    * 0.35 +
  score_friendly * 0.20 +
  score_vibe     * 0.15 +
  score_distance * 0.15 +
  score_age      * 0.15
)
```

### Distance scoring guide (for Claude prompt)

| Location | Score |
|---|---|
| Edinburgh / Lothians | 10 |
| Central Scotland (Glasgow, Stirling, Perth) | 8 |
| Northern Scotland | 7 |
| Northern England (Newcastle, Leeds, Manchester) | 5 |
| Midlands | 4 |
| London / South East | 2 |
| South West / Wales | 2 |
| Far south coast (Brighton, Bournemouth) | 1 |

### Age scoring guide

| Age | Score |
|---|---|
| 2–6 years | 10 |
| 6 months – 2 years | 7 |
| 6+ years | 8 |
| Under 6 months (kitten) | 4 |
| Unknown | 5 |

---

## Claude API Enrichment

### Function signature (pipeline/enrich.js)

```js
/**
 * @param {object} listing - Raw listing from scraper
 * @param {string} listing.description
 * @param {string} listing.location_raw
 * @param {number|null} listing.age_months
 * @param {string[]} listing.photo_urls
 * @param {string} listing.sex
 * @returns {Promise<EnrichmentResult>}
 */
async function enrichListing(listing) { ... }
```

### Expected return shape

```json
{
  "score_alone": 7,
  "score_friendly": 9,
  "score_vibe": 8,
  "score_distance": 10,
  "score_age": 7,
  "score_overall": 8.05,
  "score_rationale": {
    "alone": "Described as settled and happy to entertain itself.",
    "friendly": "Seller says very affectionate and loves cuddles.",
    "vibe": "Looks calm and curious in photos — great energy.",
    "distance": "Edinburgh listing, minimal travel required.",
    "age": "2 years old — past the demanding kitten phase."
  }
}
```

All scores must be numeric, between 0 and 10 inclusive. `score_overall` is calculated by the enrichment module itself using the weighting formula above — not by Claude.

### Model to use

`claude-opus-4-6` — most capable, needed for photo analysis and nuanced description reading. The cost per call is still negligible at this volume.

---

## Scraper Output Shape

Both scrapers must return an array of objects matching this shape:

```js
{
  source: 'pets4homes',       // or 'gumtree'
  external_url: 'https://...', // absolute URL, unique per listing
  title: 'Beautiful ragdoll kitten',
  price: 85000,               // pence (£850), or null
  age_months: 18,             // integer, or null
  age_source: 'attribute',    // where the age was read from, or null
  sex: 'female',              // 'male' | 'female' | 'unknown'
  location_raw: 'Edinburgh, Midlothian',
  description: 'Full listing text...',
  photo_urls: ['https://...', 'https://...'],  // at least one if available
  listed_at: '2026-03-01T10:00:00Z'  // ISO string, or null (JSON-LD datePosted / ad-posted-date)
}
```

The pipeline script maps this shape directly to the `listings` table columns.

---

## Pipeline Reliability

The pipeline runs unattended on a 4-hourly cron, so failures have to be both rare and legible in the job log.

**Preflight before scraping.** `run.js` validates the required env vars and calls `pingSupabase()` — a single authenticated read of `listings` — before either scraper starts. Scraping takes ~6 minutes; a Supabase problem discovered afterwards would waste the whole run, so configuration and connectivity are checked in the first second instead.

**Errors carry their cause.** Node's `fetch` reports every transport failure as `TypeError: fetch failed`, with the real reason (`ENOTFOUND`, `ECONNRESET`, TLS) hidden on the `cause` chain. `net.js` unwraps that chain into the log line, and the preflight adds a hint for the common cases — most usefully a DNS failure, which is what a paused free-tier Supabase project looks like from CI.

**Retries with backoff.** `withRetry()` retries transient network failures with exponential backoff — 4 attempts around Supabase reads/writes, 3 around page fetches (`fetch-page.js`). Permanent failures — bad hostname, bad credentials, 4xx — throw on the first attempt rather than burning the backoff budget.

**Timeouts.** Node's `fetch` has no default timeout. Supabase calls use 30s, page fetches 20s, and the workflow job caps at 45 minutes.

**Idempotent writes.** Listings are written with `upsert(..., { onConflict: 'external_url', ignoreDuplicates: true })`, so a re-run cannot fail on the unique constraint and never overwrites a row the user has already swiped. Existing URLs are paged through 1000 at a time — a plain `select` would silently return only the first 1000 and re-process everything beyond that.

**Recoverable scrapes.** Every scrape writes `pipeline/scrape-cache.json`; the workflow uploads it as an artifact when the job fails, and `node pipeline/run.js --use-cache` re-runs the enrich/insert stages against it without re-scraping.

---

## Key Design Decisions

**Why UI-first?**
Tasks 01–06 build a deployable app against fake seed data. This lets the end user test the swipe UX on her phone before the scraping pipeline exists. If gestures feel wrong or the layout doesn't work, it's caught early.

**Why no auth?**
Single user, temporary app. A Vercel URL (optionally password-protected) is sufficient.

**Why Supabase anon key in frontend?**
Row-level security is not configured for this app — it's a single-user personal tool. The anon key gives read/write access to `listings`. This is acceptable for a private personal tool. Do not put the service role key in the frontend.

**Why service role key in pipeline?**
The pipeline runs server-side (GitHub Actions) and needs to insert rows without any auth context.

**Why fetch + Cheerio over Firecrawl?**
Firecrawl was the original choice for JS rendering, but both sites serve enough listing markup in the initial HTML response that plain `fetch` plus Cheerio parsing works — and it removes a paid dependency and an API key from the pipeline. If either site moves its listing data behind client-side rendering, fall back to Playwright with `playwright-extra` and `puppeteer-extra-plugin-stealth`.
