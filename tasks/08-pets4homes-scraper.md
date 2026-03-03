# Task 08 — Pets4Homes Scraper

## Context

Task 07 is complete (enrichment module works). This task builds the scraper for Pets4Homes. It is a standalone module — it only fetches and parses listings. It does not enrich, it does not write to the database. It returns an array of raw listing objects.

Read `ARCHITECTURE.md` for the exact output shape the scraper must produce.

## Prerequisites

- [ ] Task 07 complete
- [ ] Firecrawl account created at firecrawl.dev (free tier)
- [ ] `FIRECRAWL_API_KEY` added to `.env.local`
- [ ] `npm install @mendable/firecrawl-js` run in project root

## Target URL

```
https://www.pets4homes.co.uk/sale/cats/ragdoll/
```

This lists all ragdoll cats currently for sale. Each listing card links to an individual listing page.

## Your job

### 1. Create `pipeline/scrapers/pets4homes.js`

An async function that returns an array of raw listing objects.

```js
/**
 * Scrapes Pets4Homes for ragdoll cat listings.
 * @returns {Promise<RawListing[]>}
 */
async function scrapePets4Homes() { ... }

module.exports = { scrapePets4Homes };
```

**Implementation approach:**

1. Use Firecrawl to scrape the search results page. Firecrawl can return page content as structured data or markdown — use whichever gives cleaner listing URLs.
2. Extract the URL of each individual listing from the search results.
3. For each listing URL, use Firecrawl to scrape the individual listing page and extract:
   - `external_url` — the listing page URL (absolute)
   - `title` — listing title
   - `price` — integer pence (parse "£850" → 85000), null if not listed
   - `age_months` — parse from text ("3 months" → 3, "2 years" → 24), null if not found
   - `sex` — "male", "female", or "unknown"
   - `location_raw` — location string as shown on the listing
   - `description` — full listing description text
   - `photo_urls` — array of image URLs from the listing gallery
   - `listed_at` — ISO timestamp if available, null otherwise
   - `source` — always the string `"pets4homes"`

**Practical notes:**
- Scrape the search results page first to get listing URLs, then scrape each individual listing. Do not try to extract all details from the search results cards — the detail pages have the full description and photos.
- Limit to the first 2 pages of results per run (roughly 20–40 listings). There are not hundreds of ragdoll cats listed at any one time.
- Add a 500ms delay between individual listing fetches to be polite to the server.
- If a single listing fails to scrape, log a warning and continue — do not abort the whole run.

### 2. Create `pipeline/scrapers/pets4homes.test.js`

Two test modes:

**Live test** (requires internet + API key):
```
node pipeline/scrapers/pets4homes.test.js --live
```
Runs the real scraper, asserts at least 1 result is returned, and validates the shape of the first result.

**Shape test** (no network needed):
```
node pipeline/scrapers/pets4homes.test.js
```
Uses a hardcoded fixture (a fake but realistic listing object) and asserts the shape is correct. This is the test that runs in CI.

Shape assertions for any result:
- `external_url` is a string starting with `https://`
- `source` is `"pets4homes"`
- `photo_urls` is an array (may be empty)
- `price` is an integer or null (never a string)
- `age_months` is an integer or null (never a string)
- `sex` is one of `"male"`, `"female"`, `"unknown"`
- `description` is a non-empty string

## Acceptance criteria

- [ ] `node pipeline/scrapers/pets4homes.test.js` passes (shape tests)
- [ ] `node pipeline/scrapers/pets4homes.test.js --live` returns at least 1 listing
- [ ] Each listing has all required fields from `ARCHITECTURE.md` scraper output shape
- [ ] `price` is always an integer (pence) or null — never a formatted string like "£850"
- [ ] `age_months` is always an integer or null — never a string like "2 years"
- [ ] `external_url` values are absolute URLs (start with `https://`)
- [ ] No duplicate `external_url` values within a single run
- [ ] A single listing failure does not abort the full run
- [ ] `source` is always `"pets4homes"`

## Do not

- Write to Supabase
- Call the Claude enrichment module
- Scrape more than 2 pages per run
- Throw an unhandled error if one individual listing page fails
