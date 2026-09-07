// Network error handling shared by the pipeline's Supabase and HTTP calls.
//
// Node's fetch reports every transport failure as the same opaque
// `TypeError: fetch failed`; the useful detail (ENOTFOUND, ECONNRESET, a TLS
// error) lives on the `cause` chain. These helpers unwrap that chain so logs
// say what actually went wrong, and retry the failures worth retrying.

// Transient: worth another attempt.
const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN', // temporary DNS failure (ENOTFOUND is permanent — not listed)
  'EPIPE',
  'ENETUNREACH',
  'ENETDOWN',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

// supabase-js swallows the cause chain and hands back `{ message: 'TypeError:
// fetch failed' }`, so fall back to matching the message text.
const RETRYABLE_MESSAGE = /fetch failed|network|socket hang up|timed? ?out|terminated|aborted|temporarily unavailable/i;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flattens an error and its `cause` chain into an array.
 * @param {unknown} err
 * @returns {Error[]}
 */
function errorChain(err) {
  const chain = [];
  let current = err;
  while (current instanceof Error && chain.length < 5) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

/**
 * First errno-style code found on the error or its causes (e.g. 'ENOTFOUND').
 * @param {unknown} err
 * @returns {string|null}
 */
function errorCode(err) {
  for (const link of errorChain(err)) {
    if (typeof link.code === 'string') return link.code;
  }
  return null;
}

/**
 * Human-readable description including the underlying cause, so
 * `TypeError: fetch failed` becomes something diagnosable.
 * @param {unknown} err
 * @returns {string}
 */
function describeError(err) {
  const chain = errorChain(err);
  if (chain.length === 0) return String(err);

  const parts = [`${chain[0].name}: ${chain[0].message}`];
  for (const link of chain.slice(1)) {
    const code = typeof link.code === 'string' ? ` [${link.code}]` : '';
    parts.push(`caused by ${link.message}${code}`);
  }
  if (chain.length === 1 && typeof chain[0].code === 'string') {
    parts[0] += ` [${chain[0].code}]`;
  }
  return parts.join(' — ');
}

/**
 * Whether an error looks like a transient network blip rather than a
 * permanent misconfiguration (bad hostname, bad credentials).
 * @param {unknown} err
 * @returns {boolean}
 */
function isRetryable(err) {
  if (err && err.retryable === true) return true;
  if (err && err.retryable === false) return false;

  const code = errorCode(err);
  if (code) return RETRYABLE_CODES.has(code);

  for (const link of errorChain(err)) {
    if (RETRYABLE_MESSAGE.test(link.message)) return true;
  }
  return false;
}

/**
 * Whether an Anthropic request failed because the API could not fetch an
 * image URL we passed it.
 *
 * `image` blocks of type `url` are fetched server-side, which honours the
 * host's robots.txt. Gumtree's CDN disallows it, so every Gumtree listing 400s
 * before it can be scored. Callers use this to retry without the photo.
 *
 * The API words this refusal several ways and does not always say "image" —
 * "Unable to download the file. Please verify the URL and try again." is the
 * common one, and matching only the robots.txt phrasing let it through as a
 * fatal error, dropping the listing instead of rescoring it without the photo.
 * @param {unknown} err
 * @returns {boolean}
 */
function isImageFetchRejection(err) {
  if (!err || err.status !== 400) return false;
  return /robots\.txt|disallowed|unable to (fetch|download|access|retrieve)|could not (fetch|download|access|retrieve)|(download|fetch)(ing)? the file|image/i.test(
    String(err.message || '')
  );
}

/**
 * Runs `fn`, retrying transient network failures with exponential backoff.
 * Permanent failures throw straight through so they surface immediately.
 * @param {string} label - Used in retry log lines
 * @param {() => Promise<T>} fn
 * @param {{ attempts?: number, baseDelayMs?: number, log?: (msg: string) => void }} [options]
 * @returns {Promise<T>}
 * @template T
 */
async function withRetry(label, fn, options = {}) {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const log = options.log ?? console.log;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      log(`${label} failed (attempt ${attempt}/${attempts}): ${describeError(err)}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

module.exports = { describeError, errorCode, errorChain, isRetryable, isImageFetchRejection, withRetry, sleep };
