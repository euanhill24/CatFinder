const fs = require('fs');
const path = require('path');
const { requireEnv } = require('./env');
const { describeError, withRetry } = require('./net');

// Check configuration before loading the clients, so a missing secret prints
// one clear line instead of a module-load stack trace.
let supabase;
let pingSupabase;
let SUPABASE_URL;
let enrichListing;
try {
  requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']);
  ({ supabase, pingSupabase, SUPABASE_URL } = require('./supabase-server'));
  ({ enrichListing } = require('./enrich'));
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
}

const { scrapePets4Homes } = require('./scrapers/pets4homes');
const { scrapeGumtree } = require('./scrapers/gumtree');
const { partitionBySeen, chunk } = require('./listing-sets');

const CACHE_PATH = path.join(__dirname, 'scrape-cache.json');
const useCache = process.argv.includes('--use-cache');

// PostgREST caps a single response at 1000 rows by default.
const SELECT_PAGE_SIZE = 1000;
const MAX_SELECT_PAGES = 100;

// `in.(...)` filters travel in the query string, so last_seen_at refreshes go
// out in batches rather than as one URL long enough to be rejected.
const TOUCH_CHUNK_SIZE = 20;

// Mirrors STALE_AFTER_DAYS in temp-next-app/lib/listings.ts. Duplicated
// because the pipeline is plain CommonJS and the app is TypeScript; it is used
// only for log wording, never for a query, so a drift here cannot hide cats.
const APP_STALE_AFTER_DAYS = 7;

function log(msg) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}] ${msg}`);
}

/**
 * Confirms Supabase is reachable before scraping. Previously the first
 * Supabase call happened after ~6 minutes of scraping, so an unreachable
 * project burned the whole run and discarded every listing.
 */
async function preflight() {
  log(`Checking Supabase connection (${new URL(SUPABASE_URL).host})...`);
  try {
    await withRetry('Supabase preflight', () => pingSupabase(), { log });
  } catch (err) {
    log(`FATAL: ${err.message}`);
    if (err.hint) log(`HINT: ${err.hint}`);
    process.exit(1);
  }
  log('Supabase connection OK.');
}

/**
 * Fetches every existing external_url, paging past the 1000-row response cap.
 * @returns {Promise<Set<string>>}
 */
async function fetchExistingUrls() {
  const urls = new Set();
  let from = 0;

  // Advance by rows actually returned, not by the requested page size — the
  // server may cap responses below SELECT_PAGE_SIZE, and assuming otherwise
  // would silently truncate the dedupe list.
  for (let page = 0; page < MAX_SELECT_PAGES; page++) {
    const rows = await withRetry(`Fetch existing URLs (from row ${from})`, async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('external_url')
        .order('id', { ascending: true })
        .range(from, from + SELECT_PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      return data || [];
    }, { log });

    if (rows.length === 0) return urls;

    for (const row of rows) {
      if (row.external_url) urls.add(row.external_url);
    }
    from += rows.length;
  }

  throw new Error(`Stopped paging existing listings after ${MAX_SELECT_PAGES} pages — the table is larger than expected.`);
}

/**
 * Marks every still-listed URL as seen now.
 *
 * This is the whole of the sold-listing story: the scrapers cannot tell a sold
 * cat from a live one, but a sold cat stops appearing on the source site, so
 * its last_seen_at stops advancing and the app filters it out. Runs before
 * enrichment so a Claude API outage cannot age out live listings.
 *
 * @param {string[]} urls - external_urls observed in this run.
 * @returns {Promise<number>} Rows actually updated.
 */
async function touchLastSeen(urls) {
  if (urls.length === 0) return 0;

  const seenAt = new Date().toISOString();
  let touched = 0;

  for (const batch of chunk(urls, TOUCH_CHUNK_SIZE)) {
    touched += await withRetry(`Refresh last_seen_at (${batch.length} listings)`, async () => {
      const { data, error } = await supabase
        .from('listings')
        .update({ last_seen_at: seenAt })
        .in('external_url', batch)
        .select('external_url');

      if (error) throw new Error(error.message);
      return (data || []).length;
    }, { log });
  }

  return touched;
}

async function run() {
  log('Starting pipeline run...');

  await preflight();

  let allListings = [];
  let scrapersSucceeded = 0;

  if (useCache && fs.existsSync(CACHE_PATH)) {
    allListings = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    log(`Loaded ${allListings.length} listings from scrape cache`);
    scrapersSucceeded = 1;
  } else {
    // Run Pets4Homes scraper
    try {
      log('Scraping Pets4Homes...');
      const p4h = await scrapePets4Homes();
      log(`Pets4Homes: ${p4h.length} listings fetched`);
      allListings.push(...p4h);
      scrapersSucceeded++;
    } catch (err) {
      log(`ERROR: Pets4Homes scraper failed: ${describeError(err)}`);
    }

    // Run Gumtree scraper
    try {
      log('Scraping Gumtree...');
      const gt = await scrapeGumtree();
      log(`Gumtree: ${gt.length} listings fetched`);
      allListings.push(...gt);
      scrapersSucceeded++;
    } catch (err) {
      log(`ERROR: Gumtree scraper failed: ${describeError(err)}`);
    }

    if (scrapersSucceeded === 0) {
      log('FATAL: Both scrapers failed. Exiting.');
      process.exit(1);
    }

    // Cache scraped listings for retry without re-scraping
    fs.writeFileSync(CACHE_PATH, JSON.stringify(allListings, null, 2));
    log(`Cached ${allListings.length} listings to ${CACHE_PATH}`);
  }

  // Deduplicate against existing listings in Supabase
  let existingUrls;
  try {
    existingUrls = await fetchExistingUrls();
  } catch (err) {
    log(`ERROR: Failed to fetch existing URLs: ${describeError(err)}`);
    log(`The scrape is cached — re-run with \`node pipeline/run.js --use-cache\` to retry without re-scraping.`);
    process.exit(1);
  }
  log(`${existingUrls.size} listings already in the database`);

  const { newListings: dedupedListings, seenAgainUrls } = partitionBySeen(allListings, existingUrls);
  const duplicateCount = allListings.length - dedupedListings.length;

  // A refresh failure is not fatal — the run can still insert new cats — but it
  // is worth shouting about, because listings that go unrefreshed long enough
  // vanish from the app as though they had been sold.
  try {
    const touched = await touchLastSeen(seenAgainUrls);
    log(`Refreshed last_seen_at on ${touched} still-live listing(s)`);
  } catch (err) {
    log(`ERROR: Failed to refresh last_seen_at: ${describeError(err)}`);
    log(`Listings left unrefreshed for ${APP_STALE_AFTER_DAYS} days disappear from the app — fix before then.`);
  }

  // Drop only very young kittens. The PRD prefers older cats but does not
  // exclude kittens — that preference is the `age` sub-score's job. A 12-month
  // cutoff here was doing the excluding instead, dropping 208 of 232 scraped
  // listings in a single run, because ragdoll ads are overwhelmingly kittens.
  const MIN_AGE_MONTHS = 6;
  const newListings = dedupedListings.filter(l => {
    if (l.age_months != null && l.age_months < MIN_AGE_MONTHS) {
      log(`Skipping (under ${MIN_AGE_MONTHS} months): ${l.title || l.external_url}`);
      return false;
    }
    return true;
  });
  const ageFilteredCount = dedupedListings.length - newListings.length;

  log(`${allListings.length} listings to process (${newListings.length} new, ${duplicateCount} duplicates, ${ageFilteredCount} filtered by age)`);

  let inserted = 0;
  let alreadyPresent = 0;
  let errors = 0;

  for (const listing of newListings) {
    const label = `${listing.title || listing.external_url}`.slice(0, 60);

    // Enrich with Claude
    let scores;
    try {
      log(`Enriching: ${label}...`);
      scores = await withRetry(`Enrich ${label}`, () => enrichListing(listing), { log });
    } catch (err) {
      log(`ERROR: Enrichment failed for ${label}: ${describeError(err)}`);
      errors++;
      continue;
    }

    // Merge raw listing + scores and insert
    const row = {
      source: listing.source,
      external_url: listing.external_url,
      title: listing.title,
      price: listing.price,
      age_months: listing.age_months,
      sex: listing.sex,
      location_raw: listing.location_raw,
      description: listing.description,
      photo_urls: listing.photo_urls,
      listed_at: listing.listed_at,
      last_seen_at: new Date().toISOString(),
      score_alone: scores.score_alone,
      score_friendly: scores.score_friendly,
      score_vibe: scores.score_vibe,
      score_distance: scores.score_distance,
      score_age: scores.score_age,
      score_overall: scores.score_overall,
      score_rationale: scores.score_rationale,
    };

    try {
      // Upsert rather than insert: a retried run (or a listing that appeared
      // twice across sources) must not fail on the external_url constraint.
      // ignoreDuplicates leaves any existing row — and its swipe decision — alone.
      const written = await withRetry(`Insert ${label}`, async () => {
        const { data, error: insertError } = await supabase
          .from('listings')
          .upsert(row, { onConflict: 'external_url', ignoreDuplicates: true })
          .select('external_url');
        if (insertError) throw new Error(insertError.message);
        return (data || []).length > 0;
      }, { log });

      if (written) {
        log(`Inserted: ${label} (score: ${scores.score_overall})`);
        inserted++;
      } else {
        log(`Already present, skipped: ${label}`);
        alreadyPresent++;
      }
    } catch (err) {
      log(`ERROR: Insert failed for ${label}: ${describeError(err)}`);
      errors++;
    }
  }

  log(`Run complete. ${inserted} inserted, ${duplicateCount + alreadyPresent} skipped, ${errors} errors.`);

  // A run where every new listing errored is a broken run, not a quiet one —
  // exit non-zero so the scheduled job reports it instead of passing silently.
  if (errors > 0 && inserted === 0) {
    log(`FATAL: every one of the ${errors} new listing(s) failed to process.`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(`Unhandled error: ${describeError(err)}`);
  process.exit(1);
});
