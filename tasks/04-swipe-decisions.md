# Task 04 — Swipe Decisions + Expanded View

## Context

Tasks 01–03 are complete. The swipe card UI exists and gestures animate correctly, but decisions are not saved — refreshing the page shows all cats again. This task wires decisions to Supabase and adds the expanded detail view when a card is tapped.

Read `ARCHITECTURE.md` for the database schema.

## Prerequisites

- [ ] Tasks 01–03 complete
- [ ] Swipe animations working locally

## Your job

### 1. Create `lib/decisions.ts`

Two functions:

```ts
// Sets decision = 'liked' and decided_at = now() for the given listing id
export async function likecat(id: string): Promise<void>

// Sets decision = 'dismissed' and decided_at = now() for the given listing id
export async function dismissCat(id: string): Promise<void>
```

Both use the Supabase client from `lib/supabase.ts`. Both should handle errors gracefully (log and rethrow).

### 2. Wire decisions in `app/page.tsx`

- Swipe right → call `likeCat(listing.id)` before/during animation
- Swipe left → call `dismissCat(listing.id)` before/during animation
- ♥ button → same as swipe right
- ✕ button → same as swipe left
- After decision: remove the card from local state so it does not reappear (do not refetch the full list — just splice it out)
- On refresh: `getUndecidedListings()` already filters `decision IS NULL`, so decided cats naturally don't reappear

### 3. Build the expanded detail view

Tapping a card (not swiping — tapping the card body) should open a full-screen modal or bottom sheet showing:

- Full photo gallery (horizontally swipeable, showing all `photo_urls`)
- Cat name, age, sex, location
- All five scores with their one-line rationale text from `score_rationale`
- Price (formatted as £X, or "Price on request" if null)
- Full description text (scrollable)
- "View original listing" button — opens `external_url` in a new tab
- Close button (✕ top right, or swipe down to dismiss)
- ♥ Like and ✕ Dismiss buttons at the bottom (same actions as the main card)

The modal must not interfere with swipe gestures on the card stack behind it.

### 4. Update the cat count

The "X cats to review" count shown on the main screen should decrement in real-time as decisions are made (update local state, don't refetch).

## Acceptance criteria

- [ ] Swiping right calls `likeCat()` and updates `decision = 'liked'` in Supabase
- [ ] Swiping left calls `dismissCat()` and updates `decision = 'dismissed'` in Supabase
- [ ] `decided_at` is populated in Supabase after a decision
- [ ] Decided cat disappears from the local card stack immediately
- [ ] Refreshing the page does not show previously decided cats
- [ ] ♥ and ✕ buttons produce the same DB result as swiping
- [ ] Tapping a card body (not swiping) opens the detail modal
- [ ] Detail modal shows full photo gallery, all scores with rationale text, description, and price
- [ ] "View original listing" opens in a new browser tab
- [ ] Detail modal can be closed without making a decision
- [ ] Like/Dismiss from within the detail modal works correctly
- [ ] Cat count decrements in real-time with each decision
- [ ] "You're all caught up" state shows when stack is empty

## Do not

- Build the liked list page (that is Task 05)
- Add any animation beyond what react-tinder-card provides
- Add undo / un-swipe functionality
