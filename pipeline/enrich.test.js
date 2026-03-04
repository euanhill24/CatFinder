const assert = require('assert');
const { enrichListing } = require('./enrich');

function assertValidResult(result) {
  const scoreKeys = ['score_alone', 'score_friendly', 'score_vibe', 'score_distance', 'score_age', 'score_overall'];
  for (const key of scoreKeys) {
    assert.strictEqual(typeof result[key], 'number', `${key} should be a number`);
    assert.ok(result[key] >= 0 && result[key] <= 10, `${key} should be between 0 and 10, got ${result[key]}`);
  }

  const rationaleKeys = ['alone', 'friendly', 'vibe', 'distance', 'age'];
  assert.ok(result.score_rationale, 'score_rationale should exist');
  for (const key of rationaleKeys) {
    assert.strictEqual(typeof result.score_rationale[key], 'string', `rationale.${key} should be a string`);
    assert.ok(result.score_rationale[key].length > 0, `rationale.${key} should be non-empty`);
  }

  // Verify weighted formula
  const expected = Math.round((
    result.score_alone * 0.35 +
    result.score_friendly * 0.20 +
    result.score_vibe * 0.15 +
    result.score_distance * 0.15 +
    result.score_age * 0.15
  ) * 10) / 10;
  assert.ok(
    Math.abs(result.score_overall - expected) <= 0.1,
    `score_overall ${result.score_overall} should match weighted formula ${expected}`
  );
}

async function runTests() {
  console.log('Test 1: Happy path (Edinburgh adult cat)...');
  const edinburghAdult = await enrichListing({
    description: 'Beautiful 3-year-old female ragdoll, very calm and independent. Happy to be left alone during the day. Loves cuddles in the evening but equally content napping by herself. Fully vaccinated and neutered.',
    location_raw: 'Edinburgh, Midlothian',
    age_months: 36,
    photo_urls: [],
    sex: 'female',
  });
  assertValidResult(edinburghAdult);
  console.log('  PASS — all scores valid, overall:', edinburghAdult.score_overall);

  console.log('Test 2: Distance comparison (Edinburgh vs Brighton)...');
  const brightonCat = await enrichListing({
    description: 'Lovely ragdoll cat, 2 years old, very friendly. Good with other pets.',
    location_raw: 'Brighton, East Sussex',
    age_months: 24,
    photo_urls: [],
    sex: 'male',
  });
  assertValidResult(brightonCat);
  assert.ok(
    edinburghAdult.score_distance > brightonCat.score_distance,
    `Edinburgh distance (${edinburghAdult.score_distance}) should be > Brighton (${brightonCat.score_distance})`
  );
  console.log(`  PASS — Edinburgh ${edinburghAdult.score_distance} > Brighton ${brightonCat.score_distance}`);

  console.log('Test 3: Age comparison (adult vs kitten)...');
  const kitten = await enrichListing({
    description: 'Adorable ragdoll kitten, very playful and energetic. Needs lots of attention.',
    location_raw: 'Edinburgh',
    age_months: 2,
    photo_urls: [],
    sex: 'male',
  });
  assertValidResult(kitten);
  assert.ok(
    edinburghAdult.score_age > kitten.score_age,
    `Adult age score (${edinburghAdult.score_age}) should be > kitten (${kitten.score_age})`
  );
  console.log(`  PASS — Adult ${edinburghAdult.score_age} > Kitten ${kitten.score_age}`);

  console.log('Test 4: Null fields handling...');
  const nullFields = await enrichListing({
    description: 'Ragdoll cat available for rehoming. Contact for details.',
    location_raw: 'Glasgow',
    age_months: null,
    photo_urls: [],
    sex: 'unknown',
  });
  assertValidResult(nullFields);
  console.log('  PASS — null fields handled without error');

  console.log('\nAll 4 tests passed!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
