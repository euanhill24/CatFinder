const assert = require('assert');

const FIXTURE = {
  external_url: 'https://www.pets4homes.co.uk/classifieds/12345/beautiful-ragdoll-kitten',
  title: 'Beautiful Ragdoll Kitten',
  price: 85000,
  age_months: 4,
  sex: 'female',
  location_raw: 'Edinburgh, Midlothian',
  description: 'Gorgeous ragdoll kitten looking for her forever home. Very friendly and playful, loves cuddles.',
  photo_urls: ['https://images.pets4homes.co.uk/photo1.jpg'],
  listed_at: null,
  source: 'pets4homes',
};

function assertShape(listing) {
  assert.ok(typeof listing.external_url === 'string' && listing.external_url.startsWith('https://'),
    'external_url should be an https URL');
  assert.strictEqual(listing.source, 'pets4homes', 'source should be pets4homes');
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
    const { scrapePets4Homes } = require('./pets4homes');
    const results = await scrapePets4Homes();
    console.log(`  Got ${results.length} listings`);
    assert.ok(results.length >= 1, 'Should return at least 1 listing');

    // Check no duplicate URLs
    const urls = results.map(r => r.external_url);
    assert.strictEqual(urls.length, new Set(urls).size, 'Should have no duplicate URLs');

    // Validate shape of each result
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
