const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const {
  scrapeGumtree,
  extractListingUrls,
  attributeText,
  parseListingPage,
} = require('./gumtree');

function fixture(name) {
  return cheerio.load(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'));
}

function assertShape(listing) {
  assert.ok(
    typeof listing.external_url === 'string' && listing.external_url.startsWith('https://'),
    'external_url should be an https URL'
  );
  assert.strictEqual(listing.source, 'gumtree', 'source should be gumtree');
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
  assert.strictEqual(
    listing.age_months === null,
    listing.age_source === null,
    'age_months and age_source must both be set or both be null'
  );
  assert.ok(
    ['male', 'female', 'unknown'].includes(listing.sex),
    `sex should be male/female/unknown, got ${listing.sex}`
  );
  // null is legal; the old assertion demanded non-empty and broke --live
  assert.ok(
    listing.description === null || typeof listing.description === 'string',
    'description should be a string or null'
  );
}

// Search page. Live Gumtree adverts sit under /p/cats/<slug>/<id> — confirmed
// against a run on 2026-09-07 that harvested 117 of them. An older fixture
// here used /p/cats-kittens-for-sale/, which the site does not serve.
{
  const urls = extractListingUrls(fixture('gumtree-search.html'));

  assert.ok(urls.length >= 3, `expected at least 3 listing URLs, got ${urls.length}`);
  assert.strictEqual(urls.length, new Set(urls).size, 'URLs should be unique');
  assert.ok(
    urls.every(u => u.startsWith('https://www.gumtree.com/p/cats/')),
    'relative hrefs should be absolutised'
  );
  assert.ok(urls.every(u => !u.includes('#')), 'fragments should be stripped');
}

// Attributes come from data-q hooks when present, otherwise the attributes block
{
  const $ = fixture('gumtree-listing.html');
  assert.strictEqual(attributeText($, 'Sex'), 'Male');
  assert.strictEqual(attributeText($, 'Age'), '', 'a label the page omits reads as empty');
}

// Whole-page extraction. This fixture is the shape of the listing that
// exposed the age bug in run #821: no Age field anywhere on the page, the age
// stated only in the title. It used to store age_months = null and then get
// scored as though its age were unknown.
{
  const url = 'https://www.gumtree.com/p/cats/nine-weeks-old-male-ragdoll-kitten/1801000009?utm_medium=email';
  const listing = parseListingPage(fixture('gumtree-listing.html'), url);

  assertShape(listing);
  assert.strictEqual(listing.title, '9 WEEKS OLD MALE RAGDOLL KITTEN');
  assert.strictEqual(listing.price, 35000);
  assert.strictEqual(listing.location_raw, 'Forfar, Angus');

  assert.strictEqual(listing.age_months, 2, '9 weeks in the title should read as 2 months');
  assert.strictEqual(listing.age_source, 'title', 'and should record that the title is where it came from');

  assert.strictEqual(listing.sex, 'male');
  assert.strictEqual(listing.description, 'Lovely boy, litter trained and very affectionate.');
  assert.strictEqual(listing.listed_at, '2026-09-05T14:00:00.000Z');

  // Gallery images are lazy-loaded behind data-src/srcset; reading only src
  // left the share card as the sole photo, which is what gets scored for vibe
  assert.ok(listing.photo_urls.includes('https://img.gumtree.com/photo1.jpg'), 'data-src photo');
  assert.ok(listing.photo_urls.includes('https://img.gumtree.com/photo2.jpg'), 'srcset photo');
  assert.ok(
    listing.photo_urls.every(u => u.includes('img.gumtree.com')),
    'third-party images should not be collected as advert photos'
  );

  assert.strictEqual(
    listing.external_url,
    'https://www.gumtree.com/p/cats/nine-weeks-old-male-ragdoll-kitten/1801000009'
  );
}

// A short description is kept, not discarded. It feeds the two heaviest score
// criteria (alone 35% + friendly 20%), so dropping it meant scoring 55% of the
// composite on "No description provided."
{
  const $ = cheerio.load(
    '<html><body><h1>Ragdoll</h1><div itemprop="description">Very friendly boy.</div></body></html>'
  );
  const listing = parseListingPage($, 'https://www.gumtree.com/p/cats/x/1');
  assert.strictEqual(listing.description, 'Very friendly boy.');
}

// Selector rot must yield nothing rather than something wrong
{
  const empty = extractListingUrls(cheerio.load('<html><body><p>nothing here</p></body></html>'));
  assert.deepStrictEqual(empty, [], 'a page with no adverts should yield no URLs');
}

async function main() {
  if (process.argv.includes('--live')) {
    console.log('Live test (requires internet)...');
    const results = await scrapeGumtree();
    console.log(`  Got ${results.length} listings`);
    assert.ok(results.length >= 1, 'Should return at least 1 listing');

    const urls = results.map(r => r.external_url);
    assert.strictEqual(urls.length, new Set(urls).size, 'Should have no duplicate URLs');
    for (const listing of results) assertShape(listing);
    console.log('  PASS — all listings have valid shape');
  }

  console.log('gumtree.test.js: all assertions passed');
}

main().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
