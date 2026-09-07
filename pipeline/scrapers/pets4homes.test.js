const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const {
  scrapePets4Homes,
  extractListingUrls,
  extractAttributes,
  parseListingPage,
} = require('./pets4homes');

function fixture(name) {
  return cheerio.load(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'));
}

function assertShape(listing) {
  assert.ok(
    typeof listing.external_url === 'string' && listing.external_url.startsWith('https://'),
    'external_url should be an https URL'
  );
  assert.strictEqual(listing.source, 'pets4homes', 'source should be pets4homes');
  assert.ok(Array.isArray(listing.photo_urls), 'photo_urls should be an array');
  assert.ok(
    listing.price === null || (Number.isInteger(listing.price) && listing.price >= 0),
    `price should be integer or null, got ${listing.price}`
  );
  assert.ok(
    listing.age_months === null || (Number.isInteger(listing.age_months) && listing.age_months >= 0),
    `age_months should be integer or null, got ${listing.age_months}`
  );
  assert.ok(
    [null, 'attribute', 'title', 'description'].includes(listing.age_source),
    `age_source should name a known source or be null, got ${listing.age_source}`
  );
  // An age with no source, or a source with no age, means the two fell out of
  // step somewhere — the pair is only meaningful together.
  assert.strictEqual(
    listing.age_months === null,
    listing.age_source === null,
    'age_months and age_source must both be set or both be null'
  );
  assert.ok(
    ['male', 'female', 'unknown'].includes(listing.sex),
    `sex should be male/female/unknown, got ${listing.sex}`
  );
  // null is a legal description — the scrapers return it when the advert has
  // none. The previous assertion demanded a non-empty string, so --live threw
  // on data the pipeline is designed to accept.
  assert.ok(
    listing.description === null || typeof listing.description === 'string',
    'description should be a string or null'
  );
}

// Search page: harvests advert links, and one advert is one URL however many
// tracking variants of it the page carries
{
  const urls = extractListingUrls(fixture('pets4homes-search.html'));

  assert.ok(urls.length >= 3, `expected at least 3 listing URLs, got ${urls.length}`);
  assert.strictEqual(urls.length, new Set(urls).size, 'URLs should be unique');
  assert.ok(
    urls.every(u => u.startsWith('https://www.pets4homes.co.uk/classifieds/')),
    'relative hrefs should be absolutised'
  );
  assert.ok(
    urls.every(u => !u.includes('utm_source')),
    'query strings should be stripped so one advert claims one row'
  );
}

// Attribute pairing: a row rendered without a value must not shift every
// attribute after it. The old extractor indexed two global node lists by
// ordinal, so the missing "Neutered" value made attrs['Age'] read as undefined.
{
  const attrs = extractAttributes(fixture('pets4homes-listing.html'));

  assert.strictEqual(attrs['age'], '2 years', 'Age must survive a valueless row above it');
  assert.strictEqual(attrs['gender'], 'Female');
  assert.strictEqual(attrs['microchipped'], 'Yes');
  assert.strictEqual(attrs['neutered'], '', 'a row with no value reads as empty, not as the next value');
}

// Whole-page extraction
{
  const url = 'https://www.pets4homes.co.uk/classifieds/1001-blue-mitted-ragdoll-in-edinburgh/?utm_source=promo';
  const listing = parseListingPage(fixture('pets4homes-listing.html'), url);

  assertShape(listing);
  assert.strictEqual(listing.title, 'Blue Mitted Ragdoll Girl');
  assert.strictEqual(listing.price, 85000);
  assert.strictEqual(listing.location_raw, 'Edinburgh, Midlothian');
  assert.strictEqual(listing.age_months, 24);
  assert.strictEqual(listing.age_source, 'attribute');
  assert.strictEqual(listing.sex, 'female');
  assert.ok(listing.description.startsWith('Beautiful blue mitted ragdoll girl'));

  // @type is ["Product","Offer"] here; an === 'Product' check would have
  // skipped the block entirely, losing the description and both photos
  assert.ok(listing.photo_urls.includes('https://images.pets4homes.co.uk/photo1.jpg'));
  assert.ok(listing.photo_urls.includes('https://images.pets4homes.co.uk/photo2.jpg'));

  // listed_at was hardcoded null in every scrape before this
  assert.strictEqual(listing.listed_at, '2026-09-01T09:30:00.000Z');

  assert.strictEqual(
    listing.external_url,
    'https://www.pets4homes.co.uk/classifieds/1001-blue-mitted-ragdoll-in-edinburgh/'
  );
}

// Selector rot is what these fixtures exist to catch: strip the markup the
// extractor depends on and it must report nothing rather than something wrong
{
  const $ = fixture('pets4homes-listing.html');
  $('[data-testid="attribute-name"]').remove();
  const attrs = extractAttributes($);
  assert.deepStrictEqual(attrs, {}, 'no attribute nodes should yield no attributes');

  const empty = extractListingUrls(cheerio.load('<html><body><p>nothing here</p></body></html>'));
  assert.deepStrictEqual(empty, [], 'a page with no adverts should yield no URLs');
}

async function main() {
  if (process.argv.includes('--live')) {
    console.log('Live test (requires internet)...');
    const results = await scrapePets4Homes();
    console.log(`  Got ${results.length} listings`);
    assert.ok(results.length >= 1, 'Should return at least 1 listing');

    const urls = results.map(r => r.external_url);
    assert.strictEqual(urls.length, new Set(urls).size, 'Should have no duplicate URLs');
    for (const listing of results) assertShape(listing);
    console.log('  PASS — all listings have valid shape');
  }

  console.log('pets4homes.test.js: all assertions passed');
}

main().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
