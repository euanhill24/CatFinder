const assert = require('node:assert');
const { partitionBySeen, chunk } = require('./listing-sets');

function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('listing-sets');

test('splits new listings from ones already stored', () => {
  const { newListings, seenAgainUrls } = partitionBySeen(
    [{ external_url: 'a' }, { external_url: 'b' }],
    new Set(['b'])
  );
  assert.deepStrictEqual(newListings.map(l => l.external_url), ['a']);
  assert.deepStrictEqual(seenAgainUrls, ['b']);
});

test('reports a URL scraped twice in one run only once', () => {
  const { newListings, seenAgainUrls } = partitionBySeen(
    [{ external_url: 'b' }, { external_url: 'b' }, { external_url: 'a' }, { external_url: 'a' }],
    new Set(['b'])
  );
  assert.deepStrictEqual(seenAgainUrls, ['b']);
  assert.strictEqual(newListings.length, 1, 'a duplicate new listing must not be enriched twice');
});

test('ignores listings with no URL', () => {
  const { newListings, seenAgainUrls } = partitionBySeen(
    [{ external_url: null }, {}, { external_url: 'a' }],
    new Set()
  );
  assert.deepStrictEqual(newListings.map(l => l.external_url), ['a']);
  assert.deepStrictEqual(seenAgainUrls, []);
});

test('an empty scrape touches nothing', () => {
  const { newListings, seenAgainUrls } = partitionBySeen([], new Set(['a']));
  assert.deepStrictEqual(newListings, []);
  assert.deepStrictEqual(seenAgainUrls, []);
});

test('chunk splits into fixed-size batches with a short tail', () => {
  assert.deepStrictEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('chunk of an empty array is empty', () => {
  assert.deepStrictEqual(chunk([], 10), []);
});

test('chunk rejects a zero size rather than looping forever', () => {
  assert.throws(() => chunk([1], 0), /at least 1/);
});
