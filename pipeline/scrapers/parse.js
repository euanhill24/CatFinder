// Field parsers shared by both scrapers.
//
// These used to be byte-identical copies in pets4homes.js and gumtree.js, so
// every fix had to be written twice and neither copy could be unit-tested —
// they were module-private. Keeping them here, exported, is what makes the
// age-parsing test table in parse.test.js possible.

const MONTHS_PER_YEAR = 12;
const WEEKS_PER_MONTH = 4.33;

// Ages quoted for the mother/father rather than the cat being sold, and
// ages that are really a future availability date. Both were being read as
// the listing's own age: "Ready in 2 weeks, mum is 3 years old" parsed as 36.
const NOT_THIS_CAT = /(?:mum|mother|dad|father|parents?|queen|sire|dam|stud|king|ready\s+in|ready\s+to\s+leave\s+in|leaving\s+in|leave\s+in|available\s+in)\D{0,12}$/i;

const MONTH_NAMES = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Price in pence, or null when the listing quotes no number.
 * @param {string|null} text
 * @returns {number|null}
 */
function parsePrice(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\bfree\b/.test(lower)) return 0;
  // "POA" / "offers" name no figure; returning null beats inventing one.
  const match = text.replace(/,/g, '').match(/£\s*([\d.]+)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/**
 * 'male' | 'female' | 'unknown'.
 *
 * `\b` matters here: "female" contains "male", but not at a word boundary, so
 * /\bmale\b/ correctly declines to match it. A text naming both — a mixed
 * litter, e.g. Pets4Homes' "1 male / 3 female" — is 'unknown', not whichever
 * the checks happened to test first.
 * @param {string|null} text
 * @returns {string}
 */
function parseSex(text) {
  if (!text) return 'unknown';
  const hasFemale = /\b(?:female|females|girl|girls)\b/i.test(text);
  const hasMale = /\b(?:male|males|boy|boys)\b/i.test(text);
  if (hasFemale && hasMale) return 'unknown';
  if (hasFemale) return 'female';
  if (hasMale) return 'male';
  return 'unknown';
}

function monthsSince(year, monthIndex, day) {
  const born = new Date(Date.UTC(year, monthIndex, day || 1));
  if (Number.isNaN(born.getTime())) return null;

  const now = new Date();
  let months =
    (now.getUTCFullYear() - born.getUTCFullYear()) * MONTHS_PER_YEAR +
    (now.getUTCMonth() - born.getUTCMonth());
  if (now.getUTCDate() < born.getUTCDate()) months -= 1;

  // A birth date in the future is a typo, not a negative age.
  if (months < 0) return null;
  return months;
}

/**
 * Age from an explicit date of birth: "born 12/05/2025", "DOB 01/2025",
 * "born 5th June 2025". Dates are read day-first (UK listings).
 * @param {string} text
 * @returns {number|null}
 */
function parseDateOfBirth(text) {
  const lead = '(?:born|dob|d\\.o\\.b\\.?|date\\s+of\\s+birth)\\W{0,12}';

  const dmy = text.match(new RegExp(`${lead}(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{2,4})`, 'i'));
  if (dmy) {
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    return monthsSince(year, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }

  const named = text.match(
    new RegExp(`${lead}(\\d{1,2})(?:st|nd|rd|th)?\\s+([a-z]{3,9})\\.?\\s*(\\d{4})?`, 'i')
  );
  if (named) {
    const monthIndex = MONTH_NAMES[named[2].slice(0, 3).toLowerCase()];
    if (monthIndex !== undefined) {
      const year = named[3] ? parseInt(named[3], 10) : new Date().getUTCFullYear();
      return monthsSince(year, monthIndex, parseInt(named[1], 10));
    }
  }

  // "DOB 01/2025" — month and year only.
  const my = text.match(new RegExp(`${lead}(\\d{1,2})[\\/\\-.](\\d{4})`, 'i'));
  if (my) return monthsSince(parseInt(my[2], 10), parseInt(my[1], 10) - 1, 1);

  return null;
}

// Every "N unit" mention, in the order they appear. Leading (?<![\d.]) stops
// "1.5 years" matching as the "5 years" inside it, which read as 60 months.
const AGE_PATTERNS = [
  // Compound first: "1 year and 4 months" must not read as a bare "1 year".
  {
    re: /(?<![\d.])(\d+)\s*(?:years?|yrs?)\b[\s,]*(?:and\s+|&\s*|-\s*)?(\d+)\s*(?:months?|mos?)\b/gi,
    months: m => parseInt(m[1], 10) * MONTHS_PER_YEAR + parseInt(m[2], 10),
  },
  {
    re: /(?<![\d.])(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/gi,
    months: m => Math.round(parseFloat(m[1]) * MONTHS_PER_YEAR),
  },
  {
    re: /(?<![\d.])(\d+(?:\.\d+)?)\s*(?:months?|mos?)\b/gi,
    months: m => Math.round(parseFloat(m[1])),
  },
  {
    re: /(?<![\d.])(\d+(?:\.\d+)?)\s*(?:weeks?|wks?)\b/gi,
    months: m => Math.max(1, Math.round(parseFloat(m[1]) / WEEKS_PER_MONTH)),
  },
];

/**
 * Age in months from free text, or null when the text states none.
 *
 * Picks the leftmost credible mention rather than preferring years over
 * months over weeks: the old precedence let an incidental "3 years" later in
 * the string beat the kitten's own age earlier in it. Mentions attributed to
 * a parent, or to a future availability date, are skipped entirely.
 * @param {string|null} text
 * @returns {number|null}
 */
function parseAgeMonths(text) {
  if (!text) return null;

  const dob = parseDateOfBirth(text);
  if (dob !== null) return dob;

  let best = null;
  for (const { re, months } of AGE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (NOT_THIS_CAT.test(text.slice(0, m.index))) continue;
      const value = months(m);
      if (!Number.isFinite(value) || value < 0) continue;
      // A compound match starts at the same index as the bare-years match it
      // supersedes, so <= keeps the compound that was found first.
      if (best === null || m.index < best.index) best = { index: m.index, value };
      break;
    }
  }
  return best === null ? null : best.value;
}

/**
 * Age plus where it came from, so a value read off the page can be told
 * apart from one inferred from prose — and both from a genuine unknown.
 *
 * Callers pass candidates in descending order of trust. Recording the source
 * matters because an unparsed age is not a dropped listing: it reaches the
 * scorer as "Age: Unknown" and is scored a middling 5/10, indistinguishable
 * from a real reading.
 * @param {Array<{source: string, text: string|null|undefined}>} candidates
 * @returns {{months: number|null, source: string|null}}
 */
function parseAge(candidates) {
  for (const candidate of candidates || []) {
    const months = parseAgeMonths(candidate.text);
    if (months !== null) return { months, source: candidate.source };
  }
  return { months: null, source: null };
}

/**
 * Strips query and fragment so `?utm_source=…` and `#gallery` variants of one
 * advert do not each claim a row. `external_url` is the only dedupe key, both
 * here and as the table's unique constraint.
 *
 * Apply to URLs read back from the database as well as freshly scraped ones,
 * or the two sides stop comparing equal and every listing looks new.
 * @param {string} url
 * @returns {string}
 */
function canonicaliseUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = {
  sleep,
  parsePrice,
  parseSex,
  parseAge,
  parseAgeMonths,
  parseDateOfBirth,
  canonicaliseUrl,
};
