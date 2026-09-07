const { fetchPage } = require('./fetch-page');
const { sleep, parsePrice, parseSex, parseAge, canonicaliseUrl } = require('./parse');

const BASE_URL = 'https://www.gumtree.com/search?search_category=cats&q=ragdoll';
const MAX_PAGES = 5;
const DELAY_MS = 1500;

/**
 * Collects advert URLs from a search page.
 *
 * The `/p/cats/` path is correct and verified against live output — a run on
 * 2026-09-07 harvested 117 adverts, all of the form
 * `https://www.gumtree.com/p/cats/<slug>/<id>`. Note that
 * `tasks/09-gumtree-scraper.md` and the older test fixture describe a
 * `/p/cats-kittens-for-sale/` shape that this selector would not match; those
 * documents are stale, not this selector. Don't "fix" it to match them.
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string[]}
 */
function extractListingUrls($) {
  const urls = [];
  $('a[href*="/p/cats"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = canonicaliseUrl(
      href.startsWith('http') ? href : `https://www.gumtree.com${href}`
    );
    if (!urls.includes(fullUrl)) urls.push(fullUrl);
  });
  return urls;
}

/**
 * Reads "Label: value" out of the attributes block.
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} label
 * @returns {string}
 */
function attributeText($, label) {
  const direct = $(`[data-q="${label}-value"]`).first().text().trim();
  if (direct) return direct;

  let found = '';
  $('[class*="pets-attributes"]').each((_, el) => {
    if (found) return;
    const match = $(el).text().trim().match(new RegExp(`${label}:\\s*(.+)`, 'i'));
    if (match) found = match[1].trim();
  });
  return found;
}

function extractPhotoUrls($) {
  const photo_urls = [];
  const push = src => {
    if (src && src.includes('img.gumtree.com') && !photo_urls.includes(src)) {
      photo_urls.push(src);
    }
  };

  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && !photo_urls.includes(ogImage)) photo_urls.push(ogImage);

  $('img').each((_, el) => {
    const $img = $(el);
    // Gallery images are commonly lazy-loaded, leaving src as a placeholder.
    push($img.attr('src'));
    push($img.attr('data-src'));
    const srcset = $img.attr('srcset');
    if (srcset) push(srcset.split(',')[0].trim().split(/\s+/)[0]);
  });

  return photo_urls;
}

/**
 * Extracts a listing from an already-loaded page. Kept separate from the
 * fetch so tests can drive it from a saved fixture.
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} url
 * @returns {object}
 */
function parseListingPage($, url) {
  const title = $('h1').first().text().trim() || null;
  const price = parsePrice($('[data-q="ad-price"]').first().text());
  const location_raw = $('[data-q="ad-location"]').first().text().trim() || null;

  // Keep short descriptions: they still feed the two heaviest score criteria.
  const descEl = $('[itemprop="description"]');
  let description = descEl.length ? descEl.text().trim() : null;
  description = description && description.trim() ? description.trim() : null;

  const age = parseAge([
    { source: 'attribute', text: attributeText($, 'Age') },
    { source: 'title', text: title },
    { source: 'description', text: description },
  ]);

  // Falling back to the title is deliberate, but a title naming both sexes
  // ("2 boys and 1 girl") now yields 'unknown' rather than picking one.
  const sex = parseSex(attributeText($, 'Sex') || title || '');

  const postedText =
    $('[data-q="ad-posted-date"]').first().text().trim() ||
    $('time[datetime]').first().attr('datetime') ||
    '';
  const posted = new Date(postedText);
  const listed_at = Number.isNaN(posted.getTime()) ? null : posted.toISOString();

  return {
    external_url: canonicaliseUrl(url),
    title,
    price,
    age_months: age.months,
    age_source: age.source,
    sex,
    location_raw,
    description,
    photo_urls: extractPhotoUrls($),
    listed_at,
    source: 'gumtree',
  };
}

async function scrapeListingPage(url) {
  return parseListingPage(await fetchPage(url), url);
}

/**
 * Scrapes Gumtree for ragdoll cat listings.
 * @returns {Promise<Array>}
 */
async function scrapeGumtree() {
  const allListingUrls = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}&page=${page}`;
    console.log(`  Scraping search page ${page}: ${url}`);

    let urls;
    try {
      const $ = await fetchPage(url);
      urls = extractListingUrls($);
    } catch (err) {
      if (page === 1) throw err;
      console.warn(`  Warning: Error scraping search page ${page}: ${err.message}`);
      continue;
    }

    console.log(`  Found ${urls.length} listing URLs on page ${page}`);

    if (page === 1 && urls.length === 0) {
      throw new Error(
        `Gumtree returned no listing URLs on page 1 (${url}) — the listing-link selector has probably changed.`
      );
    }

    const before = allListingUrls.length;
    allListingUrls.push(...urls);
    if (page > 1 && new Set(allListingUrls).size === before) {
      console.log(`  Page ${page} added no new listings — stopping pagination`);
      break;
    }

    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  const uniqueUrls = [...new Set(allListingUrls)];
  console.log(`  ${uniqueUrls.length} unique listing URLs to scrape`);

  const listings = [];
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    try {
      console.log(`  [${i + 1}/${uniqueUrls.length}] Scraping: ${url}`);
      listings.push(await scrapeListingPage(url));
    } catch (err) {
      console.warn(`  Warning: Failed to scrape listing ${url}: ${err.message}`);
    }
    if (i < uniqueUrls.length - 1) await sleep(DELAY_MS);
  }

  return listings;
}

module.exports = { scrapeGumtree, extractListingUrls, attributeText, parseListingPage, scrapeListingPage };
