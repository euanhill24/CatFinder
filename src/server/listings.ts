import { MIN_DECK_AGE_MONTHS, isCollectionOverdue, staleCutoff } from "@/core/rules";
import type { Cat, CollectionStatus, Decision, Deck, SavedCat, ScoreReasons, Sex } from "@/core/types";
import type { Db } from "./db";

interface CatRow {
  id: string;
  source: string;
  external_url: string;
  title: string | null;
  price_pence: number | null;
  age_months: number | null;
  sex: Sex;
  location_raw: string | null;
  description: string | null;
  photo_urls: string[];
  listed_at: Date | null;
  first_seen_at: Date;
  score_alone: number;
  score_friendly: number;
  score_vibe: number;
  score_distance: number;
  score_age: number;
  score_overall: number;
  score_reasons: ScoreReasons;
  other_adverts: { source: string; externalUrl: string }[];
}

interface SavedRow extends CatRow {
  decided_at: Date;
  note: string | null;
  gone: boolean;
}

const CAT_COLUMNS = `
  l.id, l.source, l.external_url, l.title, l.price_pence, l.age_months, l.sex,
  l.location_raw, l.description, l.photo_urls, l.listed_at, l.first_seen_at,
  l.score_alone, l.score_friendly, l.score_vibe, l.score_distance, l.score_age,
  l.score_overall, l.score_reasons,
  coalesce((
    select jsonb_agg(jsonb_build_object('source', d.source, 'externalUrl', d.external_url) order by d.first_seen_at)
    from listings d where d.duplicate_of = l.id
  ), '[]'::jsonb) as other_adverts`;

/**
 * Which listings belong in the deck (R-30, R-32): undecided, scored, a ragdoll,
 * not a copy of another advert, still listed, and not a very young kitten.
 * $1 = stale cut-off, $2 = minimum age in months.
 */
const IN_DECK = `
  l.decision is null
  and l.score_overall is not null
  and l.is_ragdoll
  and l.duplicate_of is null
  and l.source_status = 'listed'
  and l.last_seen_at >= $1
  and (l.age_months is null or l.age_months >= $2)`;

function toCat(r: CatRow): Cat {
  return {
    id: r.id,
    source: r.source,
    externalUrl: r.external_url,
    title: r.title,
    pricePence: r.price_pence,
    ageMonths: r.age_months,
    sex: r.sex,
    location: r.location_raw,
    description: r.description,
    photoUrls: r.photo_urls,
    listedAt: r.listed_at?.toISOString() ?? null,
    firstSeenAt: r.first_seen_at.toISOString(),
    scores: {
      alone: r.score_alone,
      friendly: r.score_friendly,
      vibe: r.score_vibe,
      distance: r.score_distance,
      age: r.score_age,
    },
    overall: r.score_overall,
    reasons: r.score_reasons,
    otherAdverts: r.other_adverts,
  };
}

export interface DeckOptions {
  /** How many cards to return. The deck never loads everything at once (R-49). */
  limit?: number;
  /** When she last opened the app, for the "new" count (R-47). */
  lastVisitAt?: Date | null;
  /** Cards the phone already holds, so a top-up does not repeat them. */
  excludeIds?: string[];
  now?: Date;
}

export async function getDeck(db: Db, opts: DeckOptions = {}): Promise<Deck> {
  const now = opts.now ?? new Date();
  const base = [staleCutoff(now), MIN_DECK_AGE_MONTHS];

  const rows = await db.query<CatRow>(
    `select ${CAT_COLUMNS}
     from listings l
     where ${IN_DECK}
       and l.id not in (select value::uuid from jsonb_array_elements_text($3::text::jsonb))
     order by l.score_overall desc, l.first_seen_at desc, l.id
     limit $4`,
    [...base, JSON.stringify(opts.excludeIds ?? []), opts.limit ?? 20],
  );

  const [counts] = await db.query<{ remaining: number; fresh: number }>(
    `select count(*)::int as remaining,
            (count(*) filter (where $3::timestamptz is null or l.first_seen_at > $3::timestamptz))::int as fresh
     from listings l
     where ${IN_DECK}`,
    [...base, opts.lastVisitAt ?? null],
  );

  return { cats: rows.map(toCat), remaining: counts.remaining, newSinceLastVisit: counts.fresh };
}

/** Liked cats, most recently liked first. Gone cats stay, flagged (R-64, R-71). */
export async function getSaved(db: Db, now: Date = new Date()): Promise<SavedCat[]> {
  const rows = await db.query<SavedRow>(
    `select ${CAT_COLUMNS}, l.decided_at, l.note,
            (l.source_status <> 'listed' or l.last_seen_at < $1) as gone
     from listings l
     where l.decision = 'liked'
     order by l.decided_at desc, l.id`,
    [staleCutoff(now)],
  );
  return rows.map((r) => ({
    ...toCat(r),
    likedAt: r.decided_at.toISOString(),
    note: r.note,
    gone: r.gone,
  }));
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`No listing with id ${id}`);
    this.name = "NotFoundError";
  }
}

async function updateOne(db: Db, sql: string, params: unknown[]): Promise<void> {
  const rows = await db.query(`${sql} returning id`, params);
  if (rows.length === 0) throw new NotFoundError(String(params[0]));
}

/** Records a like or dismiss. Also used to remove a cat from the saved list (R-74). */
export function decide(db: Db, id: string, decision: Decision, now: Date = new Date()): Promise<void> {
  return updateOne(db, "update listings set decision = $2, decided_at = $3 where id = $1", [id, decision, now]);
}

/** Puts a cat back in the deck (R-48). */
export function undoDecision(db: Db, id: string): Promise<void> {
  return updateOne(db, "update listings set decision = null, decided_at = null where id = $1", [id]);
}

/** Sets or clears her private note on a cat (R-75). */
export function setNote(db: Db, id: string, note: string | null): Promise<void> {
  const trimmed = note?.trim() || null;
  return updateOne(db, "update listings set note = $2 where id = $1", [id, trimmed]);
}

export async function getCollectionStatus(db: Db, now: Date = new Date()): Promise<CollectionStatus> {
  const [row] = await db.query<{ last: Date | null }>(
    "select max(finished_at) as last from collection_runs where status in ('ok', 'partial')",
  );
  const last = row?.last ?? null;
  return { lastCheckedAt: last?.toISOString() ?? null, overdue: isCollectionOverdue(last, now) };
}
