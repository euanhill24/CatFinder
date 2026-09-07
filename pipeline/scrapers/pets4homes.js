const { fetchPage } = require('./fetch-page');
const { sleep, parsePrice, parseSex, parseAge, canonicaliseUrl } = require('./parse');

const BASE_URL = 'https://www.pets4homes.co.uk/sale/cats/ragdoll/';
const MAX_PAGES = 5;
const DELAY_MS = 500;

/**
 * Every JSON-LD Product block on the page. `@type` is sometimes an array
 * (`["Product","Offer"]`), which an `=== 'Product'` check silently skipped.
 * @param {import('cheerio').CheerioAPI} $
 * @returns {object[]}
 */
function productJsonLd($) {
  const products = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html());
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        const type = node && node['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (types.includes('Product')) products.push(node);
      }
    } catch {
      // A malformed block is not a reason to lose the rest of the page.
    }
  });
  return products;
}

/**
 * Structured attributes keyed by lowercased name.
 *
 * Pairs each name with the value inside its own row. The previous version
 * indexed two independent global node lists by ordinal, so a single row
 * rendered without a value shifted every later pair — `age` would then
 * silently return a neighbouring attribute's text.
 * @param {import('cheerio').CheerioAPI} $
 * @returns {Record<string, string>}
 */
function extractAttributes($) {
  const attrs = {};
  $('[data-testid="attribute-name"]').each((_, el) => {
    const $name = $(el);
    const name = $name.text().trim().replace(/:$/, '').toLowerCase();
    if (!name) return;

    let value = $name.parent().find('[data-testid="attribute-value"]').first().text().trim();
    if (!value) {
      value = $name.nextAll('[data-testid="attribute-value"]').first().text().trim();
    }
    attrs[name] = value;
  });
  return attrs;
}

function extractListingUrls($) {
  const urls = [];
  $('a[href*="/classifieds/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = canonicaliseUrl(
      href.startsWith('http') ? href : `https://www.pets4homes.co.uk${href}`
    );
    if (!urls.includes(fullUrl)) urls.push(fullUrl);
  });
  return urls;
}

function extractLocationFromUrl(url) {
  const slugMatch = url.match(/\/classifieds\/[^/]+-in-([^/]+)/i);
  if (!slugMatch) return null;
  return slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function firstDate(...values) {
  for (const value of values) {
    if (!value || typeof value !== 'string') continue;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * Extracts a listing from an already-loaded page. Kept separate from the
 * fetch so tests can drive it from a saved fixture.
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} url
 * @returns {object}
 */
function parseListingPage($, url) {
  const products = productJsonLd($);
  const attrs = extractAttributes($);

  const title = $('h1').first().text().trim() || null;

  const priceText =
    $('[data-testid="advert-listing-price"]').first().text() ||
    $('[data-testid="pet-price"]').first().text();
  const price = parsePrice(priceText);

  const location_raw =
    $('[data-testid="listing-location"]').first().text().trim() ||
    $('[data-testid="location-button"]').first().text().trim() ||
    extractLocationFromUrl(url);

  // Description drives 55% of the composite score (alone 35% + friendly 20%),
  // so keep a short one rather than discarding it and scoring on nothing.
  let description = products.find(p => p.description)?.description || null;
  if (!description) {
    const descEl = $('[data-testid="listing-description"]');
    if (descEl.length) description = descEl.text().trim().replace(/^Description\s*/i, '');
  }
  description = description && description.trim() ? description.trim() : null;

  // Age from the structured field first, then the title, then the description.
  // Reading only the attribute meant a listing titled "9 WEEKS OLD RAGDOLL
  // KITTEN" with no Age field was stored as unknown and scored a neutral 5/10.
  const age = parseAge([
    { source: 'attribute', text: attrs['age'] },
    { source: 'title', text: title },
    { source: 'description', text: description },
  ]);

  const sex = parseSex(attrs['pets in litter'] || attrs['gender'] || attrs['sex'] || '');

  const photo_urls = [];
  for (const product of products) {
    if (!product.image) continue;
    for (const img of Array.isArray(product.image) ? product.image : [product.image]) {
      if (typeof img === 'string' && !photo_urls.includes(img)) photo_urls.push(img);
    }
  }
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && !photo_urls.includes(ogImage)) photo_urls.unshift(ogImage);

  const listed_at = firstDate(
    ...products.map(p => p.datePosted),
    ...products.map(p => p.offers && p.offers.validFrom),
    $('meta[property="article:published_time"]').attr('content')
  );

  return {
    external_url: canonicaliseUrl(url),
    title,
    price,
    age_months: age.months,
    age_source: age.source,
    sex,
    location_raw: location_raw || null,
    description,
    photo_urls,
    listed_at,
    source: 'pets4homes',
  };
}

async function scrapeListingPage(url) {
  return parseListingPage(await fetchPage(url), url);
}

/**
 * Scrapes Pets4Homes for ragdoll cat listings.
 * @returns {Promise<Array>}
 */
async function scrapePets4Homes() {
  const allListingUrls = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
    console.log(`  Scraping search page ${page}: ${url}`);

    let urls;
    try {
      const $ = await fetchPage(url);
      urls = extractListingUrls($);
    } catch (err) {
      // Page 1 failing means we have nothing; later pages are best-effort.
      if (page === 1) throw err;
      console.warn(`  Warning: Error scraping search page ${page}: ${err.message}`);
      continue;
    }

    console.log(`  Found ${urls.length} listing URLs on page ${page}`);

    // An empty first page is broken markup, not an empty market — Pets4Homes
    // always has ragdolls listed. Raising it here is what stops a selector
    // change from being reported as a successful run that ingested nothing.
    if (page === 1 && urls.length === 0) {
      throw new Error(
        `Pets4Homes returned no listing URLs on page 1 (${url}) — the listing-link selector has probably changed.`
      );
    }

    const before = allListingUrls.length;
    allListingUrls.push(...urls);
    // Out-of-range pages re-serve page 1, which the de-dupe below would hide.
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

module.exports = { scrapePets4Homes, extractListingUrls, extractAttributes, parseListingPage, scrapeListingPage };
