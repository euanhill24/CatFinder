-- Cat Finder v2 initial schema. See PRD-v2 section 8.
-- Row-level security is enabled with no policies: nothing is readable through
-- Supabase's public API. All access is from the server over a direct connection.

create table listings (
  id              uuid primary key default gen_random_uuid(),

  -- As collected (R-03). Unknown values are null, never guessed.
  source          text not null,
  external_url    text not null unique,
  title           text,
  price_pence     integer check (price_pence >= 0),
  age_months      integer check (age_months >= 0),
  sex             text not null default 'unknown' check (sex in ('male', 'female', 'unknown')),
  location_raw    text,
  description     text,
  photo_urls      text[] not null default '{}',
  listed_at       timestamptz,

  -- Lifecycle (R-60 to R-63).
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  source_status   text not null default 'listed' check (source_status in ('listed', 'reserved', 'sold')),

  -- Inclusion (R-05, R-34). Non-ragdoll listings are kept but never shown.
  -- "Too young" is not stored: it is derived from age_months at query time so
  -- the cut-off has a single definition (R-33).
  is_ragdoll      boolean not null default true,
  duplicate_of    uuid references listings (id),

  -- Scoring (R-20 to R-27). Null until scored; unscored listings are held back.
  score_alone     real check (score_alone between 0 and 10),
  score_friendly  real check (score_friendly between 0 and 10),
  score_vibe      real check (score_vibe between 0 and 10),
  score_distance  real check (score_distance between 0 and 10),
  score_age       real check (score_age between 0 and 10),
  score_overall   real check (score_overall between 0 and 10),
  score_reasons   jsonb,
  scored_at       timestamptz,
  score_attempts  integer not null default 0,

  -- Her decision (R-45). Never touched by collection (R-11).
  decision        text check (decision in ('liked', 'dismissed')),
  decided_at      timestamptz,
  note            text,

  check ((decision is null) = (decided_at is null)),
  check (duplicate_of is null or duplicate_of <> id)
);

create index listings_deck_idx on listings (score_overall desc, first_seen_at desc)
  where decision is null and score_overall is not null;
create index listings_liked_idx on listings (decided_at desc) where decision = 'liked';
create index listings_last_seen_idx on listings (last_seen_at);

create table collection_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  -- ok: every source collected. partial: at least one source failed or returned nothing.
  status       text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  -- Per source: { seen, new, scored, failed, error } (R-83, R-84).
  sources      jsonb not null default '{}',
  error        text
);

create index collection_runs_finished_idx on collection_runs (finished_at desc);

alter table listings enable row level security;
alter table collection_runs enable row level security;
