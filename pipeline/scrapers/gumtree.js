require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env.local') });

const FirecrawlApp = require('@mendable/firecrawl-js').default;

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const BASE_URL = 'https://www.gumtree.com/cats-kittens-for-sale/uk/ragdoll';
const MAX_PAGES = 2;
const DELAY_MS = 500;

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
  const weeksMatch = text.match(/(\d+)\s*weeks?/i);
  if (weeksMatch) return Math.max(1, Math.round(parseInt(weeksMatch[1]) / 4.33));

  const monthsMatch = text.match(/(\d+)\s*months?/i);
  if (monthsMatch) return parseInt(monthsMatch[1]);

  const yearsMatch = text.match(/(\d+)\s*years?/i);
  if (yearsMatch) return parseInt(yearsMatch[1]) * 12;

  return null;
}

function parseSex(text) {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  if (lower.includes('female') || lower.includes('girl')) return 'female';
  if (lower.includes('male') || lower.includes('boy')) return 'male';
  return 'unknown';
}

function extractListingUrls(markdown) {
  const urls = [];
  const regex = /https:\/\/www\.gumtree\.com\/p\/[^\s)\]"]+/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const url = match[0].replace(/[.,;]+$/, '');
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

async function scrapeListingPage(url) {
  const result = await app.scrapeUrl(url, { formats: ['markdown'] });
  if (!result.success) throw new Error(`Failed to scrape ${url}`);

  const md = result.markdown || '';

  // Extract title
  const titleMatch = md.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Extract price — handle "Free", "£850 ONO", etc.
  const priceText = md.match(/(?:Price|£)[:\s]*([^\n]+)/i);
  let price = parsePrice(priceText ? priceText[1] : md);
  // Also check for "Free" anywhere prominent
  if (price === null && /\bfree\b/i.test(md.slice(0, 2000))) {
    price = 0;
  }

  // Extract age from structured fields first, then description
  const ageField = md.match(/(?:Age|Age:)\s*([^\n]+)/i);
  let age_months = parseAge(ageField ? ageField[1] : null);
  if (age_months === null) age_months = parseAge(md);

  // Extract sex
  const sexField = md.match(/(?:Gender|Sex)[:\s]+([^\n]+)/i);
  const sex = parseSex(sexField ? sexField[1] : md);

  // Extract location — Gumtree includes region
  let location_raw = null;
  const locMatch = md.match(/(?:Location|Posted in|Area)[:\s]+([^\n]+)/i);
  if (locMatch) {
    location_raw = locMatch[1].trim();
  }

  // Extract description
  const lines = md.split('\n').filter(l => l.trim().length > 40 && !l.startsWith('#') && !l.startsWith('|'));
  const description = lines.slice(0, 10).join(' ').trim() || md.slice(0, 1000);

  // Extract photo URLs
  const photoRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  const photo_urls = [];
  let photoMatch;
  while ((photoMatch = photoRegex.exec(md)) !== null) {
    if (!photo_urls.includes(photoMatch[1])) photo_urls.push(photoMatch[1]);
  }
  if (result.metadata && result.metadata.ogImage) {
    const ogImg = result.metadata.ogImage;
    if (!photo_urls.includes(ogImg)) photo_urls.unshift(ogImg);
  }

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
    const url = page === 1 ? BASE_URL : `${BASE_URL}/page${page}`;
    console.log(`  Scraping search page ${page}: ${url}`);

    try {
      const result = await app.scrapeUrl(url, { formats: ['markdown'] });
      if (!result.success) {
        console.warn(`  Warning: Failed to scrape search page ${page}`);
        continue;
      }
      const urls = extractListingUrls(result.markdown || '');
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
