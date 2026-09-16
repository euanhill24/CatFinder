-- Adds sold/stale listing tracking to an existing `listings` table.
-- Run this manually in the Supabase SQL Editor (supabase.com → your project → SQL Editor).
-- Safe to run more than once.
--
-- Neither source site marks an advert as sold — a sold cat simply stops
-- appearing. The pipeline therefore refreshes `last_seen_at` for every URL it
-- observes on each run, and the app hides anything not seen for 7 days
-- (STALE_AFTER_DAYS in temp-next-app/lib/listings.ts).
--
-- Existing rows default to now() rather than to `ingested_at` deliberately:
-- backfilling the real first-seen date would instantly hide every listing
-- older than the staleness window, live ones included. Starting the clock now
-- means the next few runs re-confirm what is still listed, and genuinely dead
-- listings age out within 7 days.

alter table listings
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists listings_last_seen_at_idx on listings (last_seen_at);
