const fs = require('fs');
const path = require('path');
const { requireEnv } = require('./env');
const { describeError, withRetry } = require('./net');
const { canonicaliseUrl } = require('./scrapers/parse');

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

const CACHE_PATH = path.join(__dirname, 'scrape-cache.json');
const useCache = process.argv.includes('--use-cache');

// PostgREST caps a single response at 1000 rows by default.
const SELECT_PAGE_SIZE = 1000;
const MAX_SELECT_PAGES = 100;

function log(msg) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}] ${msg}`);
}

// Minimum share of scraped listings that must carry each field. A selector
// that rots partially — still matching adverts, no longer matching their
// prices — produces no error and no empty result, so nothing else in this
// pipeline would notice. Floors are set well below observed healthy rates so
// a normal run never trips them.
const FILL_FLOORS = { title: 0.8, photo_urls: 0.5, description: 0.3 };

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

/**
 * Logs how completely each field was extracted and returns the fields whose
 * fill rate fell below its floor.
 * @param {Array<object>} listings
 * @returns {string[]} names of fields that breached their floor
 */
function reportFieldFill(listings) {
  if (listings.length === 0) return [];

  const fields = ['title', 'price', 'age_months', 'sex', 'location_raw', 'description', 'photo_urls', 'listed_at'];
  const summary = [];
  const breached = [];

  for (const field of fields) {
    const filled = listings.filter(l => isFilled(l[field])).length;
    const rate = filled / listings.length;
    summary.push(`${field} ${filled}/${listings.length}`);
    if (FILL_FLOORS[field] !== undefined && rate < FILL_FLOORS[field]) {
      breached.push(`${field} ${(rate * 100).toFixed(0)}% < ${(FILL_FLOORS[field] * 100).toFixed(0)}%`);
    }
  }
  log(`Field fill: ${summary.join(', ')}`);

  // Where the age came from, so a run's age filtering can be audited rather
  // than trusted: an age read off the page is worth more than one inferred
  // from prose, and both beat the neutral 5/10 an unknown age is scored.
  const bySource = {};
  for (const l of listings) bySource[l.age_source || 'none'] = (bySource[l.age_source || 'none'] || 0) + 1;
  log(`Age source: ${Object.entries(bySource).map(([k, v]) => `${k} ${v}`).join(', ')}`);

  return breached;
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
      // Canonicalise both sides: the scrapers now strip query strings and
      // fragments, so comparing against raw stored URLs would make every
      // listing look new and re-insert it.
      if (row.external_url) urls.add(canonicaliseUrl(row.external_url));
    }
    from += rows.length;
  }

  throw new Error(`Stopped paging existing listings after ${MAX_SELECT_PAGES} pages — the table is larger than expected.`);
}

async function run() {
  log('Starting pipeline run...');

  await preflight();

  let allListings = [];
  let scrapersSucceeded = 0;
  const failedScrapers = [];

  if (useCache && fs.existsSync(CACHE_PATH)) {
    allListings = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    log(`Loaded ${allListings.length} listings from scrape cache`);
    scrapersSucceeded = 1;
  } else {
    // A scraper that reaches the site but parses nothing out of it counts as
    // a failure. Treating an empty array as success is what allowed selector
    // rot to present as a green run that ingested nothing.
    const runScraper = async (name, scrape) => {
      try {
        log(`Scraping ${name}...`);
        const results = await scrape();
        log(`${name}: ${results.length} listings fetched`);
        if (results.length === 0) {
          log(`ERROR: ${name} returned no listings — treating as a scraper failure.`);
          failedScrapers.push(name);
          return;
        }
        allListings.push(...results);
        scrapersSucceeded++;
      } catch (err) {
        log(`ERROR: ${name} scraper failed: ${describeError(err)}`);
        failedScrapers.push(name);
      }
    };

    await runScraper('Pets4Homes', scrapePets4Homes);
    await runScraper('Gumtree', scrapeGumtree);

    if (scrapersSucceeded === 0) {
      log('FATAL: Both scrapers failed. Exiting.');
      process.exit(1);
    }

    // Cache scraped listings for retry without re-scraping. Only when there
    // is something to cache — an unconditional write would replace a usable
    // cache with [] on exactly the runs the --use-cache path exists for.
    if (allListings.length > 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(allListings, null, 2));
      log(`Cached ${allListings.length} listings to ${CACHE_PATH}`);
    }
  }

  const breachedFloors = reportFieldFill(allListings);
  if (breachedFloors.length > 0) {
    log(`FATAL: extraction quality below floor (${breachedFloors.join('; ')}) — selectors have probably changed.`);
    process.exit(1);
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

  const dedupedListings = allListings.filter(l => !existingUrls.has(l.external_url));
  const duplicateCount = allListings.length - dedupedListings.length;

  // Drop only very young kittens. The PRD prefers older cats but does not
  // exclude kittens — that preference is the `age` sub-score's job. A 12-month
  // cutoff here was doing the excluding instead, dropping 208 of 232 scraped
  // listings in a single run, because ragdoll ads are overwhelmingly kittens.
  const MIN_AGE_MONTHS = 6;
  const newListings = dedupedListings.filter(l => {
    if (l.age_months != null && l.age_months < MIN_AGE_MONTHS) {
      log(`Skipping (${l.age_months}mo from ${l.age_source}): ${l.title || l.external_url}`);
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
      age_source: listing.age_source,
      sex: listing.sex,
      location_raw: listing.location_raw,
      description: listing.description,
      photo_urls: listing.photo_urls,
      listed_at: listing.listed_at,
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

  // One dead scraper is roughly half the funnel — Gumtree supplied 117 of 249
  // listings on 2026-09-07. Insert whatever the surviving source returned, but
  // still exit non-zero: a run missing a whole source is not a successful run,
  // and reporting green is how the previous breakage stayed invisible.
  if (failedScrapers.length > 0) {
    log(`FATAL: ${failedScrapers.join(' and ')} produced no listings — this run covered only part of the market.`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(`Unhandled error: ${describeError(err)}`);
  process.exit(1);
});
