# Task 05 — Liked List Page

## Context

Tasks 01–04 are complete. Swipe decisions are persisted. Cats with `decision = 'liked'` are in Supabase but there is no UI to view them. This task adds the `/liked` page and the navigation to reach it.

## Prerequisites

- [ ] Tasks 01–04 complete
- [ ] At least one cat has been right-swiped and saved to Supabase as `decision = 'liked'`

## Your job

### 1. Create `lib/liked.ts`

```ts
// Returns all listings where decision = 'liked'
// Ordered by decided_at DESC (most recently liked first)
export async function getLikedListings(): Promise<Listing[]>
```

### 2. Create `components/LikedListItem.tsx`

A compact list row for a liked cat. Shows:
- Small square thumbnail (first photo, ~72px)
- Cat name, age, location on one line
- Overall match score (numeric, e.g. "8.2 ⭐")
- "Listed on Pets4Homes" or "Listed on Gumtree"
- Date she swiped right (formatted as "Saved 2 days ago")
- A chevron or arrow indicating it's tappable
- Tapping opens `external_url` in a new browser tab

### 3. Create `app/liked/page.tsx`

- Fetches liked listings using `getLikedListings()`
- Renders them as a list using `LikedListItem`
- Shows most recently liked first
- Empty state: "No cats saved yet. Start swiping! 🐾" with a button back to the main screen
- Page title: "Saved Cats"
- Back navigation to `/`

### 4. Add navigation to main screen

Add a heart icon button in the top-right corner of `app/page.tsx` that links to `/liked`. Show a badge with the count of liked cats if count > 0.

## Acceptance criteria

- [ ] `/liked` page loads without errors
- [ ] All right-swiped cats appear on the liked list
- [ ] List is sorted most recently liked first
- [ ] Each item shows thumbnail, name, age, location, overall score, source, and saved date
- [ ] Tapping a liked cat opens the original listing in a new tab
- [ ] Empty state is shown when no cats are liked
- [ ] Heart icon in top-right of main screen links to `/liked`
- [ ] Badge on heart icon shows liked count when > 0
- [ ] Back navigation from `/liked` returns to `/`
- [ ] Page works on 390px mobile viewport

## Do not

- Add ability to un-like a cat from this page
- Add filtering or sorting controls
- Rebuild the full detail modal here — tapping goes straight to the original listing
