# Product Requirements Document — v2
## Cat Finder ("Kitty Tinder")
### Status: Draft v2.0 | Date: 2026-11-10 | Supersedes: `PRD.md` v1.1

---

## 0. How to Read This Document

This PRD describes **what the product must do for its user**, not how to build it. It is written so a fresh build — by a person or a coding agent — can choose its own stack and still produce the right product.

- **Requirements** are numbered (`R-xx`) and written as testable statements. "Must" is required for launch; "Should" is strongly wanted; "Could" is optional.
- **Lessons from v1** (§11) record things the first version got wrong in production. Every one of them is a requirement in this document. They are listed separately so nobody has to rediscover them.
- **Technical constraints** (§10) are limited to facts about the outside world (source sites, budget, hosting) that any implementation has to deal with. Technology choices are deliberately left open.

`PRD.md` (v1.1), `ARCHITECTURE.md` and `DESIGN.md` describe the v1 build. Where they disagree with this document, this document wins. `DESIGN.md` remains the visual reference unless replaced.

---

## 1. Mission

Finding a ragdoll cat currently means checking several classified sites every few hours, reading every advert in full, and making the same judgement calls over and over. This product does that work and gives the user a short, ranked, fun-to-browse list of cats she can decide on in seconds.

**Success is measured by five questions. Every requirement must serve at least one of them:**

| # | Outcome | Signal |
|---|---|---|
| O1 | **It feels fast** | The first card is usable within 2 seconds of opening the app on mobile data. A decision takes one gesture. |
| O2 | **It feels curated** | The best matches come first. Clearly unsuitable cats rarely appear. Every score comes with a reason. |
| O3 | **It never shows the same cat twice** | A cat she has decided on never comes back, even if it is re-listed, scraped again or appears on both sites. |
| O4 | **She checks it instead of the raw sites** | Coverage is good enough, and fresh enough, that she trusts it. When it is broken, it says so. |
| O5 | **She finds a cat** | The product can be retired. |

---

## 2. The User

**One person.** A doctor in Edinburgh who works long hospital shifts, lives alone, and is not technical. She mostly uses her phone, often in short gaps between shifts, sometimes on a poor connection. She loves cats.

### 2.1 What she is looking for

| Factor | Her position | How strongly it matters |
|---|---|---|
| Breed | Ragdoll (purebred or clearly ragdoll-type) | Hard requirement for being shown at all |
| Time alone | The cat will be alone for long shifts | **Primary constraint** |
| Temperament | Affectionate and gentle, not anxious or demanding | High |
| Age | Adult cats preferred. Kittens acceptable, but very young kittens need supervision she can't give | Medium |
| Distance | Based in Edinburgh, willing to travel, but distance has a real cost | Medium |
| Number of cats | One preferred, a bonded pair acceptable | She decides this. Don't filter on it |
| Price | Not a stated constraint | Shown, not scored |

### 2.2 What she doesn't want to do

- Visit Pets4Homes or Gumtree herself
- Read every advert in full to find out whether it's relevant
- Re-judge a cat she has already seen
- Manage the tool: no settings, no logins, no maintenance
- Wonder whether "no new cats" means no new cats or the app is broken

---

## 3. Scope

### 3.1 In scope

- Automatically collecting ragdoll cat listings from UK classified sites (Pets4Homes and Gumtree at launch)
- Scoring each listing against her criteria, with a plain-English reason for each score
- A mobile-first swipe interface for deciding on each cat
- A saved list of cats she liked, with everything she needs to contact the seller
- Detecting when a listed cat has gone, so the deck stays clean

### 3.2 Non-goals

- Permanence: the product is retired once she has a cat
- Multiple users, accounts, sign-up or login
- An admin interface
- Email notifications
- Desktop-first design (desktop must work, but is not optimised)
- Geographic filtering. All UK listings are collected, and distance only affects ranking
- Automatically filtering out pairs or litters (she decides)
- Anything that contacts sellers on her behalf

---

## 4. Core User Journey

```
Open app (home-screen icon)
  │
  ▼
Header shows how many cats are new since her last visit ("7 new cats")
  │
  ▼
Top card: best-scoring undecided cat that is still listed
  ├── Card face: photo, name/title, age, sex, location, key scores
  ├── Tap → detail view: photo gallery, full description, all scores
  │         with reasons, price, source, link to original advert
  │
  ├── Swipe RIGHT or tap ♥ → saved to her list
  └── Swipe LEFT  or tap ✕ → dismissed, never shown again
  │
  ▼
Next card … until the deck is empty
  │
  ▼
"You're all caught up" with when new cats were last checked for
  │
  ▼
[Any time] Saved list → contact details, original advert, still-listed status
```

---

## 5. Functional Requirements

### 5.1 Listing collection

| ID | Requirement | Priority |
|---|---|---|
| R-01 | Collect every ragdoll cat listing currently advertised in the UK on Pets4Homes and Gumtree. | Must |
| R-02 | Check for new listings at least every 4 hours, without anyone doing anything. | Must |
| R-03 | For each listing, capture: source site, original advert URL, title, price, age, sex, location as written, full description, all photo URLs, and when it was listed. Missing fields are recorded as unknown, never guessed. | Must |
| R-04 | Coverage must not depend on how many results pages a search has. A live listing must not be missed, or mistaken for sold, because it sits on page 6. | Must |
| R-05 | Exclude listings that are not ragdoll cats: other breeds, "wanted" ads, accessories, stud services, adverts for dogs that mention ragdoll toys, and so on. | Must |
| R-06 | A failure on one source must not stop collection from the other. | Must |
| R-07 | Adding a third source later (Preloved, breed rescues) must not mean reworking the rest of the system. | Should |

### 5.2 Deduplication: never the same cat twice (O3)

| ID | Requirement | Priority |
|---|---|---|
| R-10 | A listing is recorded once. Seeing it again on a later run must never create a second card. | Must |
| R-11 | A decision she has made must never be overwritten or reset by later collection runs. | Must |
| R-12 | The same cat advertised on both sites, or re-posted under a new URL (common on Gumtree), should be recognised as a likely duplicate. If she has already decided on the original, the new copy must not reach her deck. | Should |
| R-13 | When a listing is merged as a duplicate, she must still be able to reach every original advert from the detail view. | Could |

### 5.3 Scoring (O2)

Each listing is scored once, when it first arrives, on five criteria from 0 to 10.

| Criterion | What it measures | Weight |
|---|---|---|
| **Alone-friendly** | How well the cat will cope with long periods without company | 35% |
| **Friendly** | How affectionate, gentle and sociable it's described as | 20% |
| **Vibe** | Overall impression from description and photos: healthy, well cared for, appealing | 15% |
| **Distance** | How close to Edinburgh | 15% |
| **Age** | Suitability of age (see table) | 15% |
| **Overall match** | Weighted composite of the five | — |

**Distance guide**

| Location | Score |
|---|---|
| Edinburgh / Lothians | 10 |
| Central Scotland (Glasgow, Stirling, Perth, Fife) | 8 |
| Rest of Scotland | 7 |
| Northern England | 5 |
| Midlands | 4 |
| Wales, London, South East, South West | 2 |
| Far south coast | 1 |
| Unknown | 5 |

**Age guide**

| Age | Score |
|---|---|
| 2–6 years | 10 |
| Over 6 years | 8 |
| 6 months – 2 years | 7 |
| Under 6 months | 4 |
| Unknown | 5 |

| ID | Requirement | Priority |
|---|---|---|
| R-20 | Every listing that reaches her deck has all five scores and an overall score. | Must |
| R-21 | Every score has a single plain-English sentence explaining it, written as an observation about the cat ("Seller says she's happy to snooze all day while they're at work"). | Must |
| R-22 | The overall score is calculated from the weights above, never estimated. The weights must be easy to change in one place. | Must |
| R-23 | Scores and reasons are never labelled as AI-generated, algorithmic or machine-made. They are presented as facts about the cat. | Must |
| R-24 | A listing must still be scored if part of its input is unavailable, such as a photo that can't be fetched or a missing description. The affected scores use what is available, and the reason says so ("No photos to go on"). Missing data never drops a listing. | Must |
| R-25 | An Edinburgh listing must score higher on distance than a Brighton listing. A 3-year-old must score higher on age than a 10-week-old. These are acceptance checks. | Must |
| R-26 | A malformed or partial scoring result is retried. If it still fails, the listing is held back and retried on the next run, not discarded. | Must |
| R-27 | Red flags (no vaccinations, "must go today", unusually low price for the breed, kitten under 8 weeks) are noted in the relevant reason. | Should |

### 5.4 Who gets into the deck

| ID | Requirement | Priority |
|---|---|---|
| R-30 | The deck shows only listings that are undecided, scored, and still listed (see §5.7). | Must |
| R-31 | The deck is ordered by overall match, best first. | Must |
| R-32 | Very young kittens (under 6 months) are hidden from the deck. Their low age score is not enough on its own, because kittens make up the large majority of ragdoll adverts and would flood it. Kittens of unknown age are shown. | Must |
| R-33 | The age cut-off from R-32 is defined once and applied consistently. It must not be duplicated between collection and display, where the copies can drift apart. | Must |
| R-34 | Hidden listings (too young, not ragdoll) are kept, not deleted, so a rule that turns out to be wrong can be loosened without re-collecting everything. | Should |

### 5.5 Swipe deck (O1, O3)

| ID | Requirement | Priority |
|---|---|---|
| R-40 | One card at a time, filling most of a 390px-wide phone screen, with the next card visible behind it. | Must |
| R-41 | Card face shows: primary photo, title/name, age, sex, location, the alone-friendly, friendly, vibe and overall scores as bars, source site, and how long ago it was listed. | Must |
| R-42 | Swipe right = like, swipe left = dismiss. The card tilts and shows a "like" or "nope" overlay as it's dragged, so the result is clear before she lets go. | Must |
| R-43 | Large tap buttons (✕ and ♥) do the same thing, for one-handed use. | Must |
| R-44 | Tapping the card opens the detail view. Tap must work reliably on mobile touch screens and must not be mistaken for the start of a swipe, or the reverse. | Must |
| R-45 | A decision is saved immediately. Refreshing or reopening the app continues exactly where she left off. | Must |
| R-46 | If a decision can't be saved, she is told plainly that it wasn't saved and the cat will come back. The message clears once a later decision saves. | Must |
| R-47 | The header shows the number of cats **new since her last visit**, plus the number left to review. | Must |
| R-48 | Undo of the most recent swipe. | Could |
| R-49 | The deck stays smooth with hundreds of undecided listings. Don't render them all at once. | Must |

### 5.6 Detail view

| ID | Requirement | Priority |
|---|---|---|
| R-50 | Swipeable gallery of all photos. | Must |
| R-51 | Full listing description, with whitespace kept and scraped page clutter stripped (cookie banners, navigation text). | Must |
| R-52 | All five scores, each with its reason. | Must |
| R-53 | Price ("Price on request" if unknown), age, sex, location, source, date listed. | Must |
| R-54 | "View original advert" opens the source page in a new tab. | Must |
| R-55 | Like and dismiss buttons in the detail view, so she can decide without closing it. | Must |
| R-56 | Closing the view returns her to the same card. | Must |

### 5.7 Sold and removed listings

Neither source marks an advert as sold in a reliable, machine-readable way. A sold cat usually just disappears.

| ID | Requirement | Priority |
|---|---|---|
| R-60 | Every collection run records which known listings it saw again. | Must |
| R-61 | A listing not seen for 7 days is treated as gone and leaves the deck. | Must |
| R-62 | A failed or partial collection run must never make live listings look gone. Record that a listing was seen before any step that can fail, such as scoring. | Must |
| R-63 | Where a source does show "sold" or "reserved", use it, and remove the listing from the deck immediately. | Should |
| R-64 | Saved cats are **never** hidden when they go. They stay in the saved list, dimmed and labelled "No longer listed", because that's exactly what she needs to know. | Must |

### 5.8 Saved list

| ID | Requirement | Priority |
|---|---|---|
| R-70 | Reachable in one tap from the main screen via a heart icon with a count badge. | Must |
| R-71 | Lists every liked cat, most recently liked first. | Must |
| R-72 | Each entry shows: thumbnail, title/name, age, location, overall score, date liked, still-listed status, and a direct link to the original advert. | Must |
| R-73 | Tapping an entry opens the same detail view as the deck. | Should |
| R-74 | A cat can be removed from the saved list (for example after viewing it or hearing it's gone). Removing it counts as dismissing it. | Should |
| R-75 | She can add a short private note to a saved cat ("messaged 12 Nov, viewing Sat"). | Could |

### 5.9 Status and trust (O4)

| ID | Requirement | Priority |
|---|---|---|
| R-80 | **Fail loudly.** If the app can't load listings because of missing configuration, an unreachable database or anything else, it shows an error with the real reason. It must never show "You're all caught up" when it couldn't actually check. | Must |
| R-81 | The empty state says when new listings were last checked for ("Last checked 2h ago"), so she can tell "no new cats" from "collection is broken". | Must |
| R-82 | If no collection run has succeeded for over 24 hours, the app shows a gentle banner saying so. | Should |
| R-83 | Each collection run records a summary (when it ran, how many listings were seen per source, new, scored, failed) that the owner can inspect. | Must |
| R-84 | A source returning zero listings counts as a likely failure, not as a quiet day, and is flagged in the run summary. | Must |

### 5.10 Installable app

| ID | Requirement | Priority |
|---|---|---|
| R-90 | Can be added to the home screen and opens full-screen with its own icon and name. | Must |
| R-91 | Opening it with no connection shows a clear offline message, not a blank screen or an empty deck. | Should |

---

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| N-01 | **Speed:** first card usable within 2s on a mid-range phone over 4G. Swipe animations at 60fps. |
| N-02 | **Mobile-first:** designed at 390px width. Works from 360px to desktop without layout breakage. Respects safe areas (notch, home indicator). |
| N-03 | **Accessibility:** tap targets at least 44px. Swipe actions always have button equivalents. Text contrast meets WCAG AA. |
| N-04 | **Running cost:** under £5/month in total, with a hard spending cap on any paid API. |
| N-05 | **Unattended operation:** runs for months with no manual work. Transient network failures are retried. Permanent failures are reported clearly in the run summary, not retried forever. |
| N-06 | **Privacy:** no analytics or third-party tracking. The URL is not indexed by search engines. Optional password protection at the hosting layer. |
| N-07 | **Secrets:** keys that allow writes or cost money must never reach the browser. |
| N-08 | **Recoverability:** if scoring fails after collection succeeds, the run can be retried without re-collecting. |
| N-09 | **Setup:** a new developer can go from clone to a running app with sample data by following one README section. All required configuration is listed in one place, and missing configuration produces an error naming the missing values. |
| N-10 | **Testability:** scraping parsers, scoring-response validation, weighting, deduplication and stale-listing logic all have automated tests that run without network access or API keys. |

---

## 7. Experience and Tone

The visual direction from `DESIGN.md` stands: **"a cosy cat café that has an app."** Warm cream backgrounds, rose and tangerine accents, a characterful serif for names, rounded friendly sans for body text, and generous rounded corners. No cold greys, no blue, no corporate tone.

- Microcopy has personality, because she'll read it hundreds of times. The empty state rotates through a few variations.
- The swipe overlay ("Love her!" / "Not this time") is the most enjoyable moment in the product and deserves polish.
- Scores appear as bars, not numbers, on the card face. Numbers can appear in the detail view.
- Never say "AI", "algorithm", "model" or "generated" anywhere in the interface.

---

## 8. Data the Product Must Hold

These are the facts the product must store, not a schema.

**Per listing:** source; original URL (unique); title; price; age (months); sex; location as written; description; photo URLs; date listed; date first collected; date last seen; five sub-scores, overall score and five reasons; inclusion status (shown / hidden-too-young / hidden-not-ragdoll); duplicate-of reference (if R-12 is built); decision (none / liked / dismissed); date decided; note (if R-75 is built).

**Per collection run:** started at, finished at, per-source counts (seen / new / scored / failed), overall status, error summary.

**Per visit:** when she last opened the app, to power the "new since last visit" count (R-47). One device is enough, and it can live on the device.

---

## 9. Acceptance Checklist

A build is ready for her when all of these pass.

**Deck and decisions**
- [ ] A liked cat appears in the saved list. A dismissed cat never reappears, including after refresh, a collection run, or reopening the app.
- [ ] Deck order matches overall score, highest first.
- [ ] "N new cats" counts only cats collected since her last visit.
- [ ] Swipe gestures and tap-to-open both work on a real iPhone and a real Android phone.
- [ ] A save failure (simulated by cutting the connection) shows the "not saved" message, and the cat returns on reload.
- [ ] Opening the app with database configuration removed shows an error naming the problem, not an empty deck.

**Collection and scoring**
- [ ] At least one real listing arrives from each source.
- [ ] Two consecutive runs create no duplicates.
- [ ] A listing whose photo can't be fetched is still scored (on its text) and appears in the deck.
- [ ] Every listing in the deck has five scores between 0 and 10 and five non-empty reasons.
- [ ] Edinburgh beats Brighton on distance. A 3-year-old beats a 10-week-old on age.
- [ ] A non-ragdoll listing in the search results doesn't reach the deck.
- [ ] A listing beyond the fifth page of search results is collected.

**Sold listings and status**
- [ ] A listing removed from its source leaves the deck within 7 days and stays visible, badged, in the saved list if liked.
- [ ] Simulating three failed collection runs does not remove any live listing from the deck.
- [ ] The empty state shows when listings were last checked.
- [ ] A source returning zero listings is flagged in the run summary.

**Platform**
- [ ] Installs to the home screen and launches full-screen.
- [ ] Usable at 360px and 390px widths with no horizontal scroll.

---

## 10. External Constraints

These are facts about the world, not design decisions.

- **No official feeds.** Neither Pets4Homes nor Gumtree offers a public API or RSS feed for searches. Listings have to be read from their public web pages. Page structure can change without notice, so parsers must fail visibly (R-84) rather than silently return nothing.
- **Photo hosting.** Gumtree's image CDN blocks automated fetching by some third-party services. Any scoring step that relies on a remote service fetching the photo itself will fail for those listings. Fetching the image directly and passing the bytes, or falling back to text-only scoring (R-24), avoids this.
- **Volume.** Expect a few hundred ragdoll listings live at any time across both sites, mostly kittens, with roughly 5–30 new per day. Scoring cost per listing is negligible at this volume.
- **Free-tier hosting.** Free database tiers may pause after inactivity. When paused, the database looks like a DNS failure. The collector should detect and report this specifically.
- **Courtesy.** Collect at a modest rate (sequential requests, a normal browser user agent, no more often than needed) to avoid being blocked.

---

## 11. Lessons From v1

Each of these happened in production and is covered by a requirement above.

| What happened | Effect | Now required by |
|---|---|---|
| Missing frontend configuration was swallowed and the deck showed "You're all caught up" | She saw an empty, apparently working app that could never load a cat | R-80, N-09 |
| A hard 12-month age cut-off was applied in two places | 208 of 232 scraped listings were dropped. The deck was empty | R-32, R-33 |
| The scoring service couldn't fetch Gumtree photos, and the error wasn't recognised | Every Gumtree listing failed scoring and was dropped | R-24, §10 |
| The scoring response was sometimes truncated or missing the reasons | Listings were dropped on the first malformed reply | R-26 |
| Listings were only ever added, never retired | Sold cats sat at the top of the deck indefinitely | R-60–R-64 |
| Only the first 5 search pages were read | Live listings past page 5 went unseen and would be treated as sold | R-04 |
| Database-connection problems were found only after a 6-minute scrape | Every scheduled run failed late with an unhelpful "fetch failed" | N-05, R-83 |
| Reading existing listings returned only the first 1000 rows | Re-processing and duplicate work once past 1000 listings | R-10 |
| A failed swipe was logged to the console only | Decisions were silently lost | R-46 |
| Configuration lived in two different files for the app and the collector | The documented setup left the app with no credentials | N-09 |
| Header said "N cats to review", not "N new since last visit" | v1 requirement unmet | R-47 |
| Photo gallery, PWA offline behaviour and liked-cat detail were thin or missing | Less useful decision-making | R-50, R-73, R-91 |

---

## 12. Suggested Build Order

Build the UI first, so the swipe experience can be tested on her phone before collection exists.

**Phase 1 — Usable app on sample data**
1. Data store with realistic sample listings, including sold, too-young, missing-photo and long-description cases
2. App shell: installable, header, error and empty states (R-80, R-81 from day one)
3. Swipe deck with saved decisions
4. Detail view with gallery
5. Saved list
6. Deploy, and test on her phone

**Phase 2 — Real cats**

7. Scoring module, testable alone against fixed listings (R-20–R-27)
8. Source collectors, each testable alone against saved HTML (R-01–R-06)
9. Collection run: collect → mark seen → deduplicate → score → store → summary
10. Schedule it every 4 hours and add the status banner (R-82)
11. Remove the sample data

**Phase 3 — Polish (Should/Could)**

12. Cross-source duplicate detection (R-12), undo (R-48), notes (R-75), red flags (R-27)

---

## 13. Out of Scope (Future)

- More sources: Preloved, Facebook Marketplace, breed rescues and breeders' own sites
- Push notifications for exceptional matches (for example, overall score ≥ 8.5 within 50 miles)
- Filtering or sorting controls
- Sharing a cat with a friend or family member
- Re-scoring existing listings when the weights change

---

*PRD v2.0. Product source of truth for the rebuild.*
