require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-server');
const { enrichListing } = require('./enrich');
const { scrapePets4Homes } = require('./scrapers/pets4homes');
const { scrapeGumtree } = require('./scrapers/gumtree');

const CACHE_PATH = path.join(__dirname, 'scrape-cache.json');
const useCache = process.argv.includes('--use-cache');

function log(msg) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}] ${msg}`);
}

async function run() {
  log('Starting pipeline run...');

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
      log(`ERROR: Pets4Homes scraper failed: ${err.message}`);
    }

    // Run Gumtree scraper
    try {
      log('Scraping Gumtree...');
      const gt = await scrapeGumtree();
      log(`Gumtree: ${gt.length} listings fetched`);
      allListings.push(...gt);
      scrapersSucceeded++;
    } catch (err) {
      log(`ERROR: Gumtree scraper failed: ${err.message}`);
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
  const { data: existing, error: fetchError } = await supabase
    .from('listings')
    .select('external_url');

  if (fetchError) {
    log(`ERROR: Failed to fetch existing URLs: ${fetchError.message}`);
    process.exit(1);
  }

  const existingUrls = new Set((existing || []).map(r => r.external_url));
  const newListings = allListings.filter(l => !existingUrls.has(l.external_url));
  const duplicateCount = allListings.length - newListings.length;

  log(`${allListings.length} listings to process (${newListings.length} new, ${duplicateCount} duplicates)`);

  let inserted = 0;
  let errors = 0;

  for (const listing of newListings) {
    const label = `${listing.title || listing.external_url}`.slice(0, 60);

    // Enrich with Claude
    let scores;
    try {
      log(`Enriching: ${label}...`);
      scores = await enrichListing(listing);
    } catch (err) {
      log(`ERROR: Enrichment failed for ${label}: ${err.message}`);
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
      score_alone: scores.score_alone,
      score_friendly: scores.score_friendly,
      score_vibe: scores.score_vibe,
      score_distance: scores.score_distance,
      score_age: scores.score_age,
      score_overall: scores.score_overall,
      score_rationale: scores.score_rationale,
    };

    try {
      const { error: insertError } = await supabase
        .from('listings')
        .insert(row);

      if (insertError) throw insertError;
      log(`Inserted: ${label} (score: ${scores.score_overall})`);
      inserted++;
    } catch (err) {
      log(`ERROR: Insert failed for ${label}: ${err.message}`);
      errors++;
    }
  }

  log(`Run complete. ${inserted} inserted, ${duplicateCount} skipped, ${errors} errors.`);
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
