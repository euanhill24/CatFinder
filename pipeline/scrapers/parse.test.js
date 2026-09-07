const assert = require('assert');
const {
  parsePrice,
  parseSex,
  parseAge,
  parseAgeMonths,
  parseDateOfBirth,
  canonicaliseUrl,
} = require('./parse');

// Builds "DD/MM/YYYY" for a date exactly `months` ago, so the date-of-birth
// assertions below keep meaning the same thing as time passes. Day 1 keeps the
// count whole: a birthday later in the month than today has not come round yet,
// so that month is correctly not counted.
function dobStringMonthsAgo(months) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

// parseAgeMonths — the cases the previous implementation got wrong are marked
{
  const cases = [
    ['9 weeks', 2],
    ['12 weeks old', 3],
    ['3 month old', 3],
    ['18 months', 18],
    ['1 years old', 12],
    ['6-8 weeks', 2],

    // Was 60: /(\d+)\s*years?/ matched the "5 years" inside "1.5 years"
    ['1.5 years', 18],

    // Was 12: the compound regex allowed only ",", so "and" fell through to
    // the years-only branch and the months were silently dropped
    ['1 year and 4 months', 16],
    ['1 year, 4 months', 16],
    ['2 years 3 months', 27],

    // Abbreviations were unhandled entirely
    ['8 wks', 2],
    ['2 yrs', 24],

    // Was 36: years-before-weeks precedence let the mother's age win. Neither
    // figure describes this cat, so the honest answer is "not stated".
    ['Ready in 2 weeks, mum is 3 years old', null],
    ['Ready to leave in 3 weeks', null],
    ['Mum is 4 years old', null],

    ['Kitten', null],
    ['', null],
    [null, null],
    [undefined, null],
  ];

  for (const [input, expected] of cases) {
    assert.strictEqual(
      parseAgeMonths(input),
      expected,
      `parseAgeMonths(${JSON.stringify(input)}) === ${expected}`
    );
  }
}

// Date of birth — unhandled before, so every "born …" listing scored as unknown
{
  assert.strictEqual(parseAgeMonths(`born ${dobStringMonthsAgo(15)}`), 15);
  assert.strictEqual(parseAgeMonths(`DOB: ${dobStringMonthsAgo(3)}`), 3);
  assert.strictEqual(parseDateOfBirth('born 5th June 2025') !== null, true);

  // A date in the future is a typo, not a negative age
  const nextYear = new Date().getUTCFullYear() + 2;
  assert.strictEqual(parseDateOfBirth(`born 01/01/${nextYear}`), null);

  assert.strictEqual(parseDateOfBirth('no date here'), null);
}

// parseAge walks candidates in trust order and reports which one answered.
// This is the fix for the case seen in run #821: a listing titled "9 WEEKS
// OLD MALE RAGDOLL KITTEN" had no structured Age field, so it was stored with
// age_months = null and then scored as though its age were unknown.
{
  assert.deepStrictEqual(
    parseAge([
      { source: 'attribute', text: '2 years' },
      { source: 'title', text: '9 weeks old' },
    ]),
    { months: 24, source: 'attribute' }
  );

  assert.deepStrictEqual(
    parseAge([
      { source: 'attribute', text: null },
      { source: 'title', text: '9 WEEKS OLD MALE RAGDOLL KITTEN' },
      { source: 'description', text: 'ready now' },
    ]),
    { months: 2, source: 'title' }
  );

  assert.deepStrictEqual(
    parseAge([
      { source: 'attribute', text: '' },
      { source: 'title', text: 'Beautiful ragdoll kittens' },
      { source: 'description', text: `born ${dobStringMonthsAgo(4)}` },
    ]),
    { months: 4, source: 'description' }
  );

  assert.deepStrictEqual(
    parseAge([{ source: 'title', text: 'Ragdoll' }]),
    { months: null, source: null }
  );
  assert.deepStrictEqual(parseAge([]), { months: null, source: null });
  assert.deepStrictEqual(parseAge(null), { months: null, source: null });
}

// parseSex — a mixed litter must not be recorded as one definite cat
{
  assert.strictEqual(parseSex('Male'), 'male');
  assert.strictEqual(parseSex('female'), 'female');
  assert.strictEqual(parseSex('1 boy'), 'male');
  assert.strictEqual(parseSex('2 girls'), 'female');

  // Pets4Homes feeds this straight from its "Pets in litter" field; the old
  // female-first check reported every mixed litter as a single female cat
  assert.strictEqual(parseSex('1 male / 3 female'), 'unknown');
  assert.strictEqual(parseSex('Ragdoll kittens, 2 boys and 1 girl'), 'unknown');

  // "female" contains "male", but not at a word boundary
  assert.strictEqual(parseSex('female'), 'female');

  assert.strictEqual(parseSex('Ragdoll kitten'), 'unknown');
  assert.strictEqual(parseSex(null), 'unknown');
}

// parsePrice — pence, with "free" meaning zero rather than absent
{
  assert.strictEqual(parsePrice('£500'), 50000);
  assert.strictEqual(parsePrice('£1,250'), 125000);
  assert.strictEqual(parsePrice('£450 ono'), 45000);
  assert.strictEqual(parsePrice('Free to a good home'), 0);
  assert.strictEqual(parsePrice('POA'), null);
  assert.strictEqual(parsePrice(''), null);
  assert.strictEqual(parsePrice(null), null);
}

// canonicaliseUrl — external_url is the only dedupe key, so tracking
// parameters on the same advert must not create a second row
{
  assert.strictEqual(
    canonicaliseUrl('https://www.gumtree.com/p/cats/ragdoll/123?utm_source=x'),
    'https://www.gumtree.com/p/cats/ragdoll/123'
  );
  assert.strictEqual(
    canonicaliseUrl('https://www.gumtree.com/p/cats/ragdoll/123#gallery'),
    'https://www.gumtree.com/p/cats/ragdoll/123'
  );
  assert.strictEqual(
    canonicaliseUrl('https://www.pets4homes.co.uk/classifieds/123-cat-in-edinburgh/'),
    'https://www.pets4homes.co.uk/classifieds/123-cat-in-edinburgh/'
  );
  // Not a URL: hand it back rather than throwing mid-scrape
  assert.strictEqual(canonicaliseUrl('not a url'), 'not a url');
  assert.strictEqual(canonicaliseUrl(''), '');
}

console.log('parse.test.js: all assertions passed');
