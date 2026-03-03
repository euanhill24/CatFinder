# Task 09 — Gumtree Scraper

## Context

Task 08 is complete (Pets4Homes scraper works). This task builds the equivalent scraper for Gumtree. Same output shape, same module structure. Read Task 08 for the pattern to follow.

Read `ARCHITECTURE.md` for the exact output shape the scraper must produce.

## Prerequisites

- [ ] Task 08 complete
- [ ] `FIRECRAWL_API_KEY` in `.env.local` (same key as Task 08)

## Target URL

```
https://www.gumtree.com/cats-kittens-for-sale/uk/ragdoll
```

## Your job

### 1. Create `pipeline/scrapers/gumtree.js`

Follow the exact same structure as `pipeline/scrapers/pets4homes.js`.

```js
async function scrapeGumtree() { ... }
module.exports = { scrapeGumtree };
```

Same extraction targets:
- `external_url`, `title`, `price`, `age_months`, `sex`, `location_raw`, `description`, `photo_urls`, `listed_at`
- `source` — always the string `"gumtree"`

**Gumtree-specific notes:**
- Gumtree listing URLs are in the format `https://www.gumtree.com/p/cats-kittens-for-sale/...`
- Price on Gumtree is often listed as "£850 ONO" — parse the numeric part only, strip "ONO", "ono", "or nearest offer"
- Age on Gumtree may be in a structured field (e.g. "Age: 8 weeks") rather than in description text — check both
- Some Gumtree listings are free ("Free") — treat as `price: 0`
- Location on Gumtree includes a region (e.g. "Edinburgh, City of Edinburgh") — keep the full string as `location_raw`
- Limit to first 2 pages of results (~20–30 listings)
- 500ms delay between individual listing requests

### 2. Create `pipeline/scrapers/gumtree.test.js`

Same two-mode structure as `pets4homes.test.js`:

```
node pipeline/scrapers/gumtree.test.js          # shape tests only
node pipeline/scrapers/gumtree.test.js --live    # live network test
```

Same shape assertions, but `source` must be `"gumtree"`.

## Acceptance criteria

- [ ] `node pipeline/scrapers/gumtree.test.js` passes (shape tests)
- [ ] `node pipeline/scrapers/gumtree.test.js --live` returns at least 1 listing
- [ ] Each listing has all required fields from `ARCHITECTURE.md` scraper output shape
- [ ] `source` is always `"gumtree"`
- [ ] `price` is an integer (pence) or null — "Free" → 0, "£850 ONO" → 85000
- [ ] `age_months` is an integer or null
- [ ] `external_url` values are absolute Gumtree URLs
- [ ] No duplicate `external_url` values within a single run
- [ ] A single listing failure does not abort the full run

## Do not

- Write to Supabase
- Call the enrichment module
- Reuse or modify the Pets4Homes scraper — keep them as separate independent modules
