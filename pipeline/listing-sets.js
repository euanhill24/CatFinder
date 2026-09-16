// Set arithmetic over a scrape result. Kept separate from run.js so the
// new/seen-again split — which decides both what gets enriched and what stays
// visible in the app — is unit-testable.

/**
 * Splits a scrape into listings that need inserting and URLs that are already
 * stored.
 *
 * The seen-again URLs are what keep an existing listing alive: the pipeline
 * refreshes their `last_seen_at` so the app can tell a live ad from one that
 * has been sold and taken down. A URL scraped twice in one run (it appears on
 * two search pages, or on both sources) is reported once.
 *
 * @param {Array<{external_url: string}>} listings - Freshly scraped listings.
 * @param {Set<string>} existingUrls - Every external_url already in the table.
 * @returns {{newListings: Array, seenAgainUrls: string[]}}
 */
function partitionBySeen(listings, existingUrls) {
  const newListings = [];
  const seenAgain = new Set();
  const newUrls = new Set();

  for (const listing of listings) {
    const url = listing && listing.external_url;
    if (!url) continue;

    if (existingUrls.has(url)) {
      seenAgain.add(url);
    } else if (!newUrls.has(url)) {
      newUrls.add(url);
      newListings.push(listing);
    }
  }

  return { newListings, seenAgainUrls: [...seenAgain] };
}

/**
 * Splits an array into fixed-size batches.
 *
 * PostgREST puts `in.(...)` filters in the query string, so a single update
 * covering every seen listing would build a URL long enough to be rejected.
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 * @template T
 */
function chunk(items, size) {
  if (size < 1) throw new Error(`chunk size must be at least 1, got ${size}`);
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

module.exports = { partitionBySeen, chunk };
