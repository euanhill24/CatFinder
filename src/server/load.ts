import { cookies } from "next/headers";
import { connection } from "next/server";
import { describeProblem, type Problem } from "@/core/errors";
import type { CollectionStatus, Deck, SavedCat } from "@/core/types";
import { SEEN_COOKIE, SINCE_COOKIE, visitBaseline } from "@/core/visit";
import { getDb } from "./db";
import { getCollectionStatus, getDeck, getSaved, getSavedCount } from "./listings";

/** Cards sent to the phone at a time. More are fetched as she swipes (R-49). */
export const DECK_PAGE_SIZE = 12;

/**
 * Every screen loads through a function here, and each returns either its data
 * or a described problem. A failed read can therefore never be mistaken for
 * "no cats" (R-80).
 */
export type Loaded<T> = ({ ok: true } & T) | { ok: false; problem: Problem };

function failed(where: string, err: unknown): { ok: false; problem: Problem } {
  console.error(`${where} failed:`, err);
  return { ok: false, problem: describeProblem(err) };
}

export interface HomeData {
  deck: Deck;
  savedCount: number;
  status: CollectionStatus;
  /** Baseline for "new", as epoch ms, or null on a first visit. */
  since: number | null;
  now: string;
}

export async function loadHome(): Promise<Loaded<HomeData>> {
  await connection();
  const jar = await cookies();
  const now = new Date();
  const baseline = visitBaseline(jar.get(SEEN_COOKIE)?.value, jar.get(SINCE_COOKIE)?.value, now);
  try {
    const db = getDb();
    const [deck, savedCount, status] = await Promise.all([
      getDeck(db, { limit: DECK_PAGE_SIZE, lastVisitAt: baseline, now }),
      getSavedCount(db),
      getCollectionStatus(db, now),
    ]);
    return { ok: true, deck, savedCount, status, since: baseline?.getTime() ?? null, now: now.toISOString() };
  } catch (err) {
    return failed("Loading the deck", err);
  }
}

export interface SavedData {
  cats: SavedCat[];
  now: string;
}

export async function loadSaved(): Promise<Loaded<SavedData>> {
  await connection();
  const now = new Date();
  try {
    return { ok: true, cats: await getSaved(getDb(), now), now: now.toISOString() };
  } catch (err) {
    return failed("Loading saved cats", err);
  }
}
