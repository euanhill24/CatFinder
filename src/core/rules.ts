/**
 * Product rules with a single definition. The app and the collector both read
 * these; nothing else may hard-code the numbers.
 */

/** Weights for the overall match score (R-22). Must sum to 1. */
export const SCORE_WEIGHTS = {
  alone: 0.35,
  friendly: 0.2,
  vibe: 0.15,
  distance: 0.15,
  age: 0.15,
} as const;

export type ScoreKey = keyof typeof SCORE_WEIGHTS;
export const SCORE_KEYS = Object.keys(SCORE_WEIGHTS) as ScoreKey[];

export type Scores = Record<ScoreKey, number>;

/** Weighted composite of the five sub-scores, to two decimal places. */
export function overallScore(scores: Scores): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key] * SCORE_WEIGHTS[key], 0);
  return Math.round(total * 100) / 100;
}

/**
 * Kittens younger than this are kept but hidden from the deck (R-32, R-33).
 * Listings of unknown age are shown.
 */
export const MIN_DECK_AGE_MONTHS = 6;

/** A listing not seen on its source for this long is treated as gone (R-61). */
export const STALE_AFTER_DAYS = 7;

/** With no successful collection for this long, the app says so (R-82). */
export const COLLECTION_OVERDUE_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

export function staleCutoff(now: Date): Date {
  return new Date(now.getTime() - STALE_AFTER_DAYS * 24 * HOUR_MS);
}

export function isCollectionOverdue(lastSuccessAt: Date | null, now: Date): boolean {
  if (!lastSuccessAt) return true;
  return now.getTime() - lastSuccessAt.getTime() > COLLECTION_OVERDUE_HOURS * HOUR_MS;
}
