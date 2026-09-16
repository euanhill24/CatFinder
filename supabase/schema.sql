-- Kitty Tinder — listings table schema
-- Run this manually in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- Do NOT use a migration tool — just paste and execute.

create table listings (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,
  external_url    text not null unique,
  title           text,
  price           integer,
  age_months      integer,
  sex             text,
  location_raw    text,
  description     text,
  photo_urls      text[],
  listed_at       timestamptz,
  ingested_at     timestamptz default now(),
  -- Last pipeline run that saw this listing on the source site. The pipeline
  -- refreshes it for every URL it observes, so a sold listing stops advancing
  -- and the app filters it out. See supabase/alter-add-last-seen-at.sql for
  -- adding this to a table created before the column existed.
  last_seen_at    timestamptz not null default now(),
  score_alone     numeric,
  score_friendly  numeric,
  score_vibe      numeric,
  score_distance  numeric,
  score_age       numeric,
  score_overall   numeric,
  score_rationale jsonb,
  decision        text,
  decided_at      timestamptz
);

-- Supports the app's staleness filter (last_seen_at >= now() - 7 days).
create index listings_last_seen_at_idx on listings (last_seen_at);
