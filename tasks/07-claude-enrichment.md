# Task 07 — Claude Enrichment Module

## Context

Task 01 is complete (Supabase schema exists). This task builds the enrichment module that scores a raw cat listing. It is a standalone Node.js module — it does not scrape, it does not write to the database. It takes a listing object in, returns a scores object out. Build and test it in isolation before it is wired into the pipeline in Task 10.

Read `ARCHITECTURE.md` for the exact scoring weights, the expected return shape, the distance scoring guide, and the age scoring guide.

## Prerequisites

- [ ] Task 01 complete
- [ ] Anthropic API account created at console.anthropic.com
- [ ] `ANTHROPIC_API_KEY` added to `.env.local`
- [ ] `npm install @anthropic-ai/sdk` run in project root

## Your job

### 1. Create `pipeline/enrich.js`

An async function that takes a raw listing object and returns enriched score data.

**Input shape** (raw listing from scraper):
```js
{
  description: string,
  location_raw: string,
  age_months: number | null,
  photo_urls: string[],
  sex: string
}
```

**Output shape**:
```js
{
  score_alone: number,      // 0–10
  score_friendly: number,   // 0–10
  score_vibe: number,       // 0–10
  score_distance: number,   // 0–10
  score_age: number,        // 0–10
  score_overall: number,    // calculated by this module, not by Claude
  score_rationale: {
    alone: string,          // one plain-English sentence
    friendly: string,
    vibe: string,
    distance: string,
    age: string
  }
}
```

**Implementation notes:**

- Use model `claude-opus-4-6`
- Send the listing description as text. Send the first photo URL as an image if available (use Claude's vision capability).
- Ask Claude to return ONLY a JSON object — no prose, no markdown fences. Parse with `JSON.parse()`.
- `score_overall` is NOT calculated by Claude. Calculate it in JavaScript using the weights from `ARCHITECTURE.md`:
  ```js
  score_overall = (
    score_alone    * 0.35 +
    score_friendly * 0.20 +
    score_vibe     * 0.15 +
    score_distance * 0.15 +
    score_age      * 0.15
  )
  ```
- Round `score_overall` to 1 decimal place.
- If Claude returns a score outside 0–10, clamp it: `Math.min(10, Math.max(0, score))`.
- If the API call fails, throw an error with the original error message. Do not swallow errors.
- Use the distance and age scoring guides from `ARCHITECTURE.md` in the prompt so Claude calibrates correctly.

**The prompt must:**
- Explain the context (Edinburgh doctor, works long shifts, cat alone often)
- Ask for scores for each of the 5 criteria
- Include the distance and age scoring guides as reference tables
- Instruct Claude to return only JSON, no other text
- Not mention AI, machine learning, or scoring systems in the rationale text — rationale should read as natural observations about the cat

### 2. Create `pipeline/enrich.test.js`

Tests using Node's built-in `assert` module (no test framework needed).

Test cases:
1. **Happy path:** Call `enrichListing()` with a realistic fake listing (Edinburgh location, adult cat, good description). Assert: all 5 score fields present, all between 0 and 10, rationale has 5 non-empty strings, score_overall matches the weighted formula.
2. **Distance test:** Call with an Edinburgh listing and a Brighton listing. Assert Edinburgh score_distance > Brighton score_distance.
3. **Age test:** Call with a 3-year-old cat and a 2-month-old kitten. Assert adult score_age > kitten score_age.
4. **Null fields:** Call with `age_months: null` and `photo_urls: []`. Assert it doesn't throw and returns valid scores.

Run with: `node pipeline/enrich.test.js`

## Acceptance criteria

- [ ] `enrichListing(fakeListing)` returns valid JSON with all 5 score fields
- [ ] All scores are numeric and between 0 and 10
- [ ] `score_overall` matches the weighted formula from `ARCHITECTURE.md` (within 0.1 rounding tolerance)
- [ ] `score_rationale` has exactly 5 keys, each a non-empty string
- [ ] Rationale text reads as natural observations — no mention of "AI", "algorithm", or "score"
- [ ] Edinburgh listing scores higher on distance than Brighton listing
- [ ] Adult cat scores higher on age than a 2-month kitten
- [ ] Null `age_months` and empty `photo_urls` are handled without throwing
- [ ] All 4 test cases pass: `node pipeline/enrich.test.js` exits with code 0

## Do not

- Write to Supabase (that is Task 10)
- Import or reference any scraper code
- Use the `NEXT_PUBLIC_` prefixed env vars — this is a server-side module
- Expose the API key in any output or logs
