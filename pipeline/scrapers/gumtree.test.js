const assert = require('assert');

const FIXTURE = {
  external_url: 'https://www.gumtree.com/p/cats-kittens-for-sale/ragdoll-kitten/12345',
  title: 'Ragdoll Kitten',
  price: 75000,
  age_months: 3,
  sex: 'male',
  location_raw: 'Edinburgh, City of Edinburgh',
  description: 'Beautiful ragdoll kitten for sale. Very playful and loving. Had first vaccinations.',
  photo_urls: ['https://img.gumtree.com/photo1.jpg'],
  listed_at: null,
  source: 'gumtree',
};

function assertShape(listing) {
  assert.ok(typeof listing.external_url === 'string' && listing.external_url.startsWith('https://'),
    'external_url should be an https URL');
  assert.strictEqual(listing.source, 'gumtree', 'source should be gumtree');
  assert.ok(Array.isArray(listing.photo_urls), 'photo_urls should be an array');
  assert.ok(listing.price === null || (Number.isInteger(listing.price) && listing.price >= 0),
    `price should be integer or null, got ${listing.price}`);
  assert.ok(listing.age_months === null || (Number.isInteger(listing.age_months) && listing.age_months >= 0),
    `age_months should be integer or null, got ${listing.age_months}`);
  assert.ok(['male', 'female', 'unknown'].includes(listing.sex),
    `sex should be male/female/unknown, got ${listing.sex}`);
  assert.ok(typeof listing.description === 'string' && listing.description.length > 0,
    'description should be a non-empty string');
}

async function runTests() {
  const isLive = process.argv.includes('--live');

  console.log('Shape test (fixture)...');
  assertShape(FIXTURE);
  console.log('  PASS');

  if (isLive) {
    console.log('Live test (requires internet + API key)...');
    const { scrapeGumtree } = require('./gumtree');
    const results = await scrapeGumtree();
    console.log(`  Got ${results.length} listings`);
    assert.ok(results.length >= 1, 'Should return at least 1 listing');

    const urls = results.map(r => r.external_url);
    assert.strictEqual(urls.length, new Set(urls).size, 'Should have no duplicate URLs');

    for (const listing of results) {
      assertShape(listing);
    }
    console.log('  PASS — all listings have valid shape');
  }

  console.log('\nAll tests passed!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
