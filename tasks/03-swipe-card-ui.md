# Task 03 — Swipe Card UI

## Context

Tasks 01 and 02 are complete. The Next.js app runs locally, the Supabase client is configured, and there are 5 fake cat listings in the database. This task builds the visual swipe card interface. Swiping does not persist decisions yet (that is Task 04) — this task is purely about display and gesture feel.

Read `ARCHITECTURE.md` for the database schema and scoring weights.

## Prerequisites

- [ ] Task 01 complete (5 fake cats in Supabase)
- [ ] Task 02 complete (Next.js running locally)
- [ ] `.env.local` populated with Supabase credentials

## Your job

### 1. Install swipe gesture library

```
npm install react-tinder-card
```

### 2. Create `lib/listings.ts`

A function that fetches undecided listings from Supabase, ordered by `ingested_at` descending (newest first).

```ts
// Returns all listings where decision is null
// Ordered by ingested_at DESC
export async function getUndecidedListings(): Promise<Listing[]>
```

Also export the `Listing` type matching the database schema from `ARCHITECTURE.md`.

### 3. Create `components/ScoreBar.tsx`

A visual score bar component. Props: `label: string`, `score: number` (0–10), `emoji: string`.

Renders as a horizontal bar filled proportionally to the score. Use Tailwind for styling. Keep it compact — four bars need to fit on a mobile card without scrolling.

Example usage:
```tsx
<ScoreBar emoji="🏠" label="Alone OK" score={7} />
<ScoreBar emoji="😸" label="Friendly" score={9} />
<ScoreBar emoji="✨" label="Vibe" score={8} />
<ScoreBar emoji="⭐" label="Overall" score={8} />
```

### 4. Create `components/CatCard.tsx`

The main card component. Props: `listing: Listing`.

Card layout (mobile-first, designed for 390px width):

```
┌─────────────────────────────┐
│  [Primary photo — full width │
│   ~60% of card height]       │
│                              │
│  Name · Age · Sex            │
│  📍 Location                 │
│                              │
│  🏠 Alone OK    ████████░░  │
│  😸 Friendly    █████████░  │
│  ✨ Vibe        ████████░░  │
│  ⭐ Overall     ████████░░  │
│                              │
│  Source · Listed X ago       │
└─────────────────────────────┘
```

Requirements:
- Primary photo uses the first URL from `photo_urls`. If array is empty, show a neutral placeholder (a grey box with a cat emoji).
- Age display: convert `age_months` to human-readable (`age_months < 12` → "X months", otherwise "X years")
- "Listed X ago" uses `listed_at` or `ingested_at` as fallback
- Source label: "Pets4Homes" or "Gumtree" (capitalised)
- Card has a subtle shadow and rounded corners
- On tap: does nothing yet (expansion is Task 04's concern — keep it simple for now)

### 5. Update `app/page.tsx`

- Fetch undecided listings using `getUndecidedListings()`
- Render them as a stacked card deck using `react-tinder-card`
- Only the top card is visible/interactive
- Show count of undecided cats at the top: "7 cats to review" (or "1 cat to review" singular)
- Show "You're all caught up! Check back later 🐾" when the stack is empty
- Swipe handlers are wired up but do nothing yet (console.log the direction is fine)
- ✕ button (left) and ♥ button (right) below the card — tap triggers the same swipe animation, but no persistence yet

## Acceptance criteria

- [ ] Fake cats appear as a stacked card deck on the homepage
- [ ] Primary photo is visible and fills the top of the card
- [ ] Name, age (human-readable), sex, and location are displayed
- [ ] All four score bars are visible with correct proportional fill
- [ ] Score bars display the emoji and label
- [ ] Source ("Pets4Homes" / "Gumtree") displayed on each card
- [ ] "X cats to review" count shown
- [ ] Swiping left or right animates the card away (does not persist — next card appears)
- [ ] ✕ and ♥ buttons trigger swipe animation
- [ ] Empty state shown when all cards are swiped
- [ ] Layout works on 390px viewport width without horizontal scroll
- [ ] No layout breaks on desktop (it doesn't need to look great, just not broken)

## Do not

- Persist swipe decisions to Supabase (that is Task 04)
- Build the expanded detail view (that is Task 04)
- Build the liked list page (that is Task 05)
- Over-engineer the styling — functional and clean is the goal
