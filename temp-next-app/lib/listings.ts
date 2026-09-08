import { getSupabase } from "./supabase";

export interface Listing {
  id: string;
  source: string;
  external_url: string;
  title: string | null;
  price: number | null;
  age_months: number | null;
  sex: string | null;
  location_raw: string | null;
  description: string | null;
  photo_urls: string[] | null;
  listed_at: string | null;
  ingested_at: string;
  /**
   * Last pipeline run that saw this listing on the source site. The pipeline
   * touches it for every URL it observes, so a listing that has been sold and
   * taken down stops advancing and ages out of the deck.
   */
  last_seen_at: string;
  score_alone: number | null;
  score_friendly: number | null;
  score_vibe: number | null;
  score_distance: number | null;
  score_age: number | null;
  score_overall: number | null;
  score_rationale: {
    alone: string;
    friendly: string;
    vibe: string;
    distance: string;
    age: string;
  } | null;
  decision: string | null;
  decided_at: string | null;
}

/**
 * How long a listing may go unseen before it is treated as gone.
 *
 * The pipeline runs every 4 hours, so this tolerates ~42 consecutive failed
 * runs before a live listing is wrongly hidden — while a sold cat disappears
 * within a week rather than sitting at the top of the deck forever.
 */
export const STALE_AFTER_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO timestamp before which a listing counts as stale. */
export function staleCutoffIso(now: number = Date.now()): string {
  return new Date(now - STALE_AFTER_DAYS * MS_PER_DAY).toISOString();
}

/** Whether this listing has not been seen on the source site recently. */
export function isStale(listing: Listing, now: number = Date.now()): boolean {
  if (!listing.last_seen_at) return false;
  return new Date(listing.last_seen_at).getTime() < now - STALE_AFTER_DAYS * MS_PER_DAY;
}

/**
 * Listings still awaiting a swipe: undecided, not a very young kitten, and
 * still present on the source site.
 */
export async function getUndecidedListings(): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .is("decision", null)
    .or("age_months.is.null,age_months.gte.6")
    .gte("last_seen_at", staleCutoffIso())
    .order("score_overall", { ascending: false });

  if (error) throw error;
  return (data as Listing[]) ?? [];
}
