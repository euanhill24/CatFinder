# Product Requirements Document
## Cat Finder — "Kitty Tinder"
### For: Euan's sister (Edinburgh-based doctor seeking a ragdoll cat)
### Status: Draft v1.1 | Date: 2026-03-01

---

## 1. Mission

This product exists to solve one problem: finding a ragdoll cat is currently a drag. She's checking multiple sites every few hours, manually filtering through listings, and making the same judgement calls repeatedly. That shouldn't be her job.

**The only five things that determine whether this succeeded:**

1. Does it feel fast?
2. Does it feel curated?
3. Does it avoid showing the same cat twice?
4. Does she check it instead of raw sites?
5. Does she find a cat?

Everything in this document serves those five outcomes. If a feature doesn't serve at least one of them, it doesn't belong here.

---

## 2. Problem Statement

Ragdoll cat listings appear sporadically across Pets4Homes and Gumtree. Each site has inconsistent information. Assessing suitability — temperament, independence, distance, age — requires reading every listing carefully. There is no single place that brings it all together, scores it, and lets her make a quick decision.

The end user needs a fun, low-effort way to stay on top of new listings and make fast decisions on each cat — without ever having to visit the raw sites again.

---

## 3. Goals

- Aggregate all ragdoll cat listings from Pets4Homes and Gumtree automatically
- Score each listing against suitability criteria without surfacing the mechanism (no "AI summary" labels — scores just appear as facts about the cat)
- Present listings as swipeable cards on a mobile-first interface
- Track decisions so she never sees the same cat twice
- Make the process genuinely fun rather than a chore

---

## 4. Non-Goals

- This is not a permanent product — it runs until she acquires a cat
- No admin interface
- No user accounts or registration
- No email notifications
- Desktop optimisation is not a priority (must not break on desktop, but not the focus)
- No geographic filtering — all UK ragdoll listings are ingested; distance feeds into scoring only
- No automatic filtering by number of cats — she makes that call herself

---

## 5. Target User

**One person.** A doctor in Edinburgh, non-technical, primarily on her smartphone between hospital shifts. Cat-obsessed. Wants a ragdoll that fits her life: long shifts, often out, living alone.

**Lifestyle constraints the scoring must reflect:**
- Cat will be alone for extended periods (shift work)
- One cat preferred, two acceptable
- Kittens not excluded but older cats preferred — kittens need more supervision
- Based in Edinburgh; willing to travel, but distance is a real factor

---

## 6. Core User Journey

```
Open app
  │
  ▼
See count of new cats since last visit ("7 new cats")
  │
  ▼
First undecided card shown
  ├── Scores visible on card face (fast, curated feel)
  ├── Tap to expand: full description + photo gallery
  │
  ├── Swipe RIGHT (or tap ♥) → Saved to Liked list
  └── Swipe LEFT (or tap ✕) → Dismissed, never shown again
  │
  ▼
Next undecided card
  │
  ▼
"You're all caught up! Check back later 🐾"
  │
  ▼
[Optional] View Liked list → original listing links, contact details
```

---

## 7. Scoring Criteria

Each listing is scored once, automatically, when it enters the database. Scores are displayed as visual indicators on the card. They are presented as factual attributes of the listing — never labelled as AI-generated or algorithmically produced.

| Criterion | What it measures | Weight |
|---|---|---|
| **Alone Friendliness** | Tolerance for extended periods without human company | 35% |
| **Friendliness / Temperament** | How sociable and affectionate the cat is described as | 20% |
| **Vibe** | Overall personality — would a cat-mad Edinburgh doctor love this? | 15% |
| **Distance** | Proximity to Edinburgh. EH postcode = max, far south = min | 15% |
| **Age Suitability** | Older cats score higher; very young kittens score lower | 15% |
| **Overall Match** | Weighted composite of all five | — |

Alone Friendliness carries the most weight because it is the primary constraint in her lifestyle.

---

## 8. Card Design (Mobile)

### Card Face

```
┌─────────────────────────────┐
│  [Primary photo — full width]│
│                              │
│  Snowball · 3yrs · Female   │
│  📍 Edinburgh · 2 miles      │
│                              │
│  🏠 Alone OK    ████████░░  │
│  😸 Friendly    █████████░  │
│  ✨ Vibe        ████████░░  │
│  ⭐ Overall     ████████░░  │
│                              │
│  Pets4Homes · Listed 4h ago │
└─────────────────────────────┘
         ✕           ♥
```

### Expanded View (tap to open)

- Full photo gallery (swipeable)
- Full listing description
- All five scores with a one-line plain-English rationale each
- Price (if listed)
- "View original listing" button (opens in new tab)
- Seller contact details / link

---

## 9. Liked List

Accessible via a heart icon (top right of main screen). Shows all right-swiped cats, newest first.

Each entry shows:
- Thumbnail photo
- Name, age, location
- Overall match score
- Direct link to original listing
- Date decision was made

No un-swiping. Once a decision is made, it stays. This keeps the UX fast and removes second-guessing.

---

## 10. Technical Architecture

### 10.1 How the Two Main Components Differ

The **scraper** and the **Claude API enrichment** are separate steps that do completely different things:

- **Scraper:** visits Pets4Homes and Gumtree, reads the pages like a browser would, and pulls out raw data — name, age, photos, description, price, location, URL. No intelligence. Just copying.
- **Claude API:** receives that raw data and thinks about it. Produces the suitability scores and one-line rationales. Never visits any website.

They run one after the other as part of the same pipeline. The scraper runs first, hands its results to Claude, Claude hands its results to the database.

### 10.2 Scraping Approach

**Primary: Firecrawl**
A scraping service that handles JavaScript-rendered pages (which both Pets4Homes and Gumtree use). Has a free tier (500 pages/month) which is sufficient for this volume. Preferred because it requires no browser infrastructure to maintain.

**Fallback: Playwright with stealth plugin**
If Firecrawl proves insufficient or unreliable, switch to a self-managed Playwright instance running in GitHub Actions. Free, but requires selector maintenance if sites change their structure.

Neither Pets4Homes nor Gumtree have public APIs or RSS feeds. Direct HTTP/HTML scraping (Cheerio) will not work — both sites render listings with JavaScript.

### 10.3 Pipeline

**Runner:** GitHub Actions scheduled workflow
**Schedule:** Every 4 hours
**Process per run:**
1. Scrape Pets4Homes for "ragdoll" cat listings, UK-wide
2. Scrape Gumtree for "ragdoll" cat listings, UK-wide
3. For each listing: check if URL already exists in Supabase — skip if so
4. For new listings only: call Claude API with listing text + primary photo
5. Store enriched listing with scores in Supabase

**Deduplication key:** Listing URL (unique constraint)
**Failure handling:** If a run fails, the next scheduled run picks up. No alerting needed for a temporary personal tool.

### 10.4 Claude API Enrichment

**This is a separate product from Claude Pro.** Claude Pro is a personal subscription to claude.ai. The Claude API is a developer product billed per usage at console.anthropic.com. They do not share credits or quota.

Called once per new listing at ingestion time. Never called again for the same listing.

The prompt instructs Claude to:
- Analyse the description for temperament, independence, and suitability for long absences
- Analyse the primary photo for vibe
- Score distance from listing location to Edinburgh EH1
- Return structured JSON: five scores (0–10) plus one-line rationale per criterion

**Estimated cost:** Ragdoll cats are a niche. Realistically 5–30 new UK listings per day across both sites. At that volume: under £1/month, likely closer to 10–20p.

### 10.5 Database (Supabase)

Supabase is a hosted PostgreSQL database with a web dashboard and a simple API for reading/writing from the frontend. Sign up free at supabase.com — no credit card required. Creating a project takes two minutes. The developer receives the project URL and API key as environment variables.

**Table: `listings`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| source | text | 'pets4homes' or 'gumtree' |
| external_url | text | Unique — deduplication key |
| title | text | |
| price | integer | Pence, nullable |
| age_months | integer | Nullable |
| sex | text | 'male', 'female', 'unknown' |
| location_raw | text | As listed on source site |
| description | text | Full listing text |
| photo_urls | text[] | Array of image URLs |
| listed_at | timestamptz | When listed on source site |
| ingested_at | timestamptz | When pipeline picked it up |
| score_alone | numeric | 0–10 |
| score_friendly | numeric | 0–10 |
| score_vibe | numeric | 0–10 |
| score_distance | numeric | 0–10 |
| score_age | numeric | 0–10 |
| score_overall | numeric | 0–10, weighted composite |
| score_rationale | jsonb | One-line plain English per criterion |
| decision | text | null / 'liked' / 'dismissed' |
| decided_at | timestamptz | Nullable |

### 10.6 Frontend

**Framework:** Next.js 14+ (App Router)
**Styling:** Tailwind CSS
**Deployment:** Vercel free tier
**Access:** Direct URL, no login. Vercel password protection available if needed.

| Route | Purpose |
|---|---|
| `/` | Main swipe interface |
| `/liked` | Saved cats list |

**PWA:** Manifest + service worker so it can be added to her home screen and feels like a native app.

**Swipe:** Touch gesture library (e.g. `react-tinder-card`) plus tap buttons (✕ / ♥) for one-handed use.

**State:** Entirely in Supabase. Refreshing picks up exactly where she left off.

### 10.7 Infrastructure & Costs

| Component | Service | Cost |
|---|---|---|
| Scraping runner | GitHub Actions | Free |
| Scraping engine | Firecrawl (free tier) | Free |
| Enrichment | Claude API (console.anthropic.com) | ~10–50p/month |
| Database | Supabase (free tier) | Free |
| Frontend hosting | Vercel (free tier) | Free |
| **Total** | | **~10–50p/month** |

Note: Claude Pro does not cover Claude API usage. A separate account at console.anthropic.com is required with a payment method. A spend cap of £5/month is recommended for safety — this project will not get close to it.

---

## 11. Accounts to Create (Before Development Starts)

| Account | URL | Cost | Card needed? |
|---|---|---|---|
| GitHub | github.com | Free | No |
| Supabase | supabase.com | Free | No |
| Vercel | vercel.com | Free | No |
| Anthropic API | console.anthropic.com | Pay-as-you-go | Yes |
| Firecrawl | firecrawl.dev | Free tier | No |

---

## 12. Build Sequence

Tasks are ordered so that the UI is usable as early as possible. The app runs against fake seed data first so the swipe UX can be tested on a real phone before the scraping pipeline exists.

### Phase 1 — Working UI (testable on day one)

| Task | What it produces | Verifiable when |
|---|---|---|
| 01 | Supabase project + schema + 5 fake cat listings seeded | Can query DB and see fake cats |
| 02 | Next.js scaffold + Tailwind + PWA manifest | App loads in browser |
| 03 | Swipe card UI reading from Supabase | Fake cats appear as swipeable cards |
| 04 | Swipe decisions persisted (left/right updates DB) | Swiped cats disappear from queue |
| 05 | Liked list page | Right-swipes appear at `/liked` |
| 06 | Deploy to Vercel | Live URL accessible on a real phone |

**At this point:** share the URL with your sister. The UX is fully testable with fake cats. If the gestures feel wrong or the card layout doesn't work on her phone, you find out now — not after building the pipeline.

### Phase 2 — Real cats start flowing in

| Task | What it produces | Verifiable when |
|---|---|---|
| 07 | Claude enrichment module (standalone) | Given a fake listing object, returns valid scored JSON |
| 08 | Pets4Homes scraper | Returns array of real listing objects when run |
| 09 | Gumtree scraper | Returns array of real listing objects when run |
| 10 | Pipeline script (scrape → deduplicate → enrich → insert) | Real cats appear in DB; no duplicates on second run |
| 11 | GitHub Actions cron (runs every 4 hours) | Pipeline runs automatically; new cats appear in app |

**At this point:** delete the fake seed data. Real ragdoll cats are now flowing in automatically.

---

## 13. Testing Requirements

Each task has its own acceptance criteria in the task file. The following are the cross-cutting scenarios a testing agent should verify at the end of each phase.

### After Phase 1

- Swiping right saves the cat to the liked list
- Swiping left permanently removes the cat from the queue
- Neither liked nor dismissed cats reappear on refresh
- "New cats" count reflects only undecided listings
- App loads and is usable on a 390px viewport (iPhone standard)
- Touch swipe gestures register correctly on a mobile browser
- Liked list shows all right-swiped cats with working external links
- App can be added to home screen as a PWA

### After Phase 2

- Scraper returns at least one real ragdoll listing from Pets4Homes
- Scraper returns at least one real ragdoll listing from Gumtree
- Running the pipeline twice does not create duplicate listings
- Enrichment returns valid JSON with all five scores between 0 and 10
- An Edinburgh listing scores higher on distance than a Brighton listing
- Rationale is populated for all five criteria
- GitHub Actions workflow triggers on schedule and completes without error
- New real listings appear in the swipe queue within 4 hours of being posted

---

## 14. Out of Scope (Future)

- Additional sources: Preloved, Facebook Marketplace, breed rescues
- Push notifications for high-scoring listings
- Un-swipe / undo
- Filtering UI
- Scraper health monitoring or alerting

---

*PRD v1.1 — ready for task file generation and developer execution.*
