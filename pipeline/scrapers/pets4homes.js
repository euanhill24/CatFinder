const { fetchPage } = require('./fetch-page');

const BASE_URL = 'https://www.pets4homes.co.uk/sale/cats/ragdoll/';
const MAX_PAGES = 5;
const DELAY_MS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/£\s*([\d.]+)/);
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * 100);
}

function parseAge(text) {
  if (!text) return null;

  // Handle compound: "1 year, 4 months" or "2 years 3 months"
  const compoundMatch = text.match(/(\d+)\s*years?\s*,?\s*(\d+)\s*months?/i);
  if (compoundMatch) return parseInt(compoundMatch[1]) * 12 + parseInt(compoundMatch[2]);

  const yearsMatch = text.match(/(\d+)\s*years?/i);
  if (yearsMatch) return parseInt(yearsMatch[1]) * 12;

  const monthsMatch = text.match(/(\d+)\s*months?/i);
  if (monthsMatch) return parseInt(monthsMatch[1]);

  const weeksMatch = text.match(/(\d+)\s*weeks?/i);
  if (weeksMatch) return Math.max(1, Math.round(parseInt(weeksMatch[1]) / 4.33));

  return null;
}

function parseSex(text) {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  if (lower.includes('female') || lower.includes('girl')) return 'female';
  if (lower.includes('male') || lower.includes('boy')) return 'male';
  return 'unknown';
}

function extractListingUrls($) {
  const urls = [];
  $('a[href*="/classifieds/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const fullUrl = href.startsWith('http')
        ? href
        : `https://www.pets4homes.co.uk${href}`;
      if (!urls.includes(fullUrl)) urls.push(fullUrl);
    }
  });
  return urls;
}

async function scrapeListingPage(url) {
  const $ = await fetchPage(url);

  // Title
  const title = $('h1').first().text().trim() || null;

  // Price — data-testid selector, fallback to any text with £
  const priceText =
    $('[data-testid="advert-listing-price"]').first().text() ||
    $('[data-testid="pet-price"]').first().text();
  const price = parsePrice(priceText);

  // Location — reliable data-testid selector
  const location_raw =
    $('[data-testid="listing-location"]').first().text().trim() ||
    $('[data-testid="location-button"]').first().text().trim() ||
    extractLocationFromUrl(url);

  // Extract structured attributes (Age, Sex, etc.)
  const attrs = {};
  $('[data-testid="attribute-name"]').each((i, el) => {
    const name = $(el).text().trim();
    const value = $('[data-testid="attribute-value"]').eq(i).text().trim();
    attrs[name] = value;
  });

  // Age
  const age_months = parseAge(attrs['Age'] || null);

  // Sex — from "Pets in litter" field (e.g. "1 male / 3 female") or general attributes
  const sex = parseSex(attrs['Pets in litter'] || attrs['Gender'] || attrs['Sex'] || '');

  // Description — from JSON-LD (most reliable) or data-testid
  let description = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).html());
      if (j['@type'] === 'Product' && j.description) {
        description = j.description;
      }
    } catch (e) {}
  });
  if (!description) {
    const descEl = $('[data-testid="listing-description"]');
    if (descEl.length) {
      // Remove the "Description" heading text
      description = descEl.text().trim().replace(/^Description\s*/i, '');
    }
  }
  if (description && description.length < 50) description = null;

  // Photos — from JSON-LD image array (best), then OG image, then page images
  const photo_urls = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).html());
      if (j['@type'] === 'Product' && j.image) {
        const images = Array.isArray(j.image) ? j.image : [j.image];
        images.forEach(img => {
          if (typeof img === 'string' && !photo_urls.includes(img)) photo_urls.push(img);
        });
      }
    } catch (e) {}
  });
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && !photo_urls.includes(ogImage)) photo_urls.unshift(ogImage);

  return {
    external_url: url,
    title,
    price,
    age_months,
    sex,
    location_raw: location_raw || null,
    description,
    photo_urls,
    listed_at: null,
    source: 'pets4homes',
  };
}

function extractLocationFromUrl(url) {
  const slugMatch = url.match(/\/classifieds\/[^/]+-in-([^/]+)/i);
  if (slugMatch) {
    return slugMatch[1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  // Try the last segment before trailing slash
  const parts = url.replace(/\/$/, '').split('-');
  // URL format: /classifieds/ID-title-words-LOCATION/
  // Location is typically the last hyphenated word(s) after the title
  return null;
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

    try {
      const $ = await fetchPage(url);
      const urls = extractListingUrls($);
      console.log(`  Found ${urls.length} listing URLs on page ${page}`);
      allListingUrls.push(...urls);
    } catch (err) {
      console.warn(`  Warning: Error scraping search page ${page}: ${err.message}`);
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
      const listing = await scrapeListingPage(url);
      listings.push(listing);
    } catch (err) {
      console.warn(`  Warning: Failed to scrape listing ${url}: ${err.message}`);
    }
    if (i < uniqueUrls.length - 1) await sleep(DELAY_MS);
  }

  return listings;
}

module.exports = { scrapePets4Homes };
