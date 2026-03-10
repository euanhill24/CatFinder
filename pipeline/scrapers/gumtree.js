const { fetchPage } = require('./fetch-page');

const BASE_URL = 'https://www.gumtree.com/search?search_category=cats&q=ragdoll';
const MAX_PAGES = 5;
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePrice(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('free')) return 0;
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
  $('a[href*="/p/cats/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const fullUrl = href.startsWith('http')
        ? href
        : `https://www.gumtree.com${href}`;
      if (!urls.includes(fullUrl)) urls.push(fullUrl);
    }
  });
  return urls;
}

async function scrapeListingPage(url) {
  const $ = await fetchPage(url);

  // Title
  const title = $('h1').first().text().trim() || null;

  // Price
  const priceText = $('[data-q="ad-price"]').first().text();
  const price = parsePrice(priceText);

  // Location — reliable data-q selector
  const location_raw = $('[data-q="ad-location"]').first().text().trim() || null;

  // Age — from data-q attribute or from attributes text
  let ageText = $('[data-q="Age-value"]').first().text().trim();
  if (!ageText) {
    // Fallback: look in the attributes section
    $('[class*="pets-attributes"]').each((_, el) => {
      const text = $(el).text().trim();
      const ageMatch = text.match(/Age:\s*(.+)/i);
      if (ageMatch && !ageText) ageText = ageMatch[1];
    });
  }
  const age_months = parseAge(ageText || null);

  // Sex — from attributes section
  let sexText = '';
  $('[class*="pets-attributes"]').each((_, el) => {
    const text = $(el).text().trim();
    const sexMatch = text.match(/Sex:\s*(.+)/i);
    if (sexMatch && !sexText) sexText = sexMatch[1];
  });
  const sex = parseSex(sexText || title || '');

  // Description
  const descEl = $('[itemprop="description"]');
  let description = descEl.length ? descEl.text().trim() : null;
  if (description && description.length < 50) description = null;

  // Photos — from carousel images and OG image
  const photo_urls = [];
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) photo_urls.push(ogImage);

  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('img.gumtree.com') && !photo_urls.includes(src)) {
      photo_urls.push(src);
    }
  });

  return {
    external_url: url,
    title,
    price,
    age_months,
    sex,
    location_raw,
    description,
    photo_urls,
    listed_at: null,
    source: 'gumtree',
  };
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

module.exports = { scrapeGumtree };
