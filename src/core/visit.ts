/**
 * "New since her last visit" (R-47).
 *
 * Two times are remembered on the phone: when she was last active, and the
 * baseline the current visit counts "new" from. Coming back after a gap starts
 * a new visit, and the baseline moves up to when she was last here.
 */

export const VISIT_GAP_MINUTES = 30;

export const SEEN_COOKIE = "kt_seen";
export const SINCE_COOKIE = "kt_since";

function parse(value: string | undefined): Date | null {
  if (!value) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : null;
}

/**
 * The time to count new cats from. Null means there is no earlier visit to
 * compare against, so everything counts as new.
 */
export function visitBaseline(seenCookie: string | undefined, sinceCookie: string | undefined, now: Date): Date | null {
  const seen = parse(seenCookie);
  if (!seen) return null;
  const gapMs = now.getTime() - seen.getTime();
  if (gapMs > VISIT_GAP_MINUTES * 60_000) return seen;
  return parse(sinceCookie);
}
