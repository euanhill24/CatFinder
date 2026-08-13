const cheerio = require('cheerio');
const { withRetry, describeError } = require('../net');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Node's fetch has no default timeout; without one a stalled response hangs
// the scrape until the CI job itself is killed.
const TIMEOUT_MS = 20000;

async function fetchPage(url) {
  return withRetry(`Fetch ${url}`, async () => {
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const error = new Error(`Request to ${url} failed: ${describeError(err)}`);
      error.cause = err;
      throw error;
    }

    if (!res.ok) {
      const error = new Error(`HTTP ${res.status} for ${url}`);
      // Rate limits and server errors often clear on a second attempt.
      error.retryable = res.status >= 500 || res.status === 429;
      throw error;
    }

    const html = await res.text();
    return cheerio.load(html);
  }, { attempts: 3, log: msg => console.warn(`  ${msg}`) });
}

module.exports = { fetchPage };
