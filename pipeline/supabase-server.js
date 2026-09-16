const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./env');
const { describeError, errorCode } = require('./net');

const REQUEST_TIMEOUT_MS = 30000;

const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

let parsedUrl;
try {
  parsedUrl = new URL(SUPABASE_URL);
} catch {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${SUPABASE_URL}". ` +
    'It should look like https://<project-ref>.supabase.co'
  );
}
if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
  throw new Error(`NEXT_PUBLIC_SUPABASE_URL must be an http(s) URL, got "${SUPABASE_URL}"`);
}

// Node's fetch has no default timeout — without one a stalled connection hangs
// the whole run until the job's own timeout kills it.
function fetchWithTimeout(input, init = {}) {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout },
});

/**
 * Verifies the project is reachable and the service role key works, before
 * the pipeline spends several minutes scraping. Uses raw fetch rather than
 * the client so the underlying network cause survives into the error message.
 * @returns {Promise<void>} Resolves when the listings table is readable.
 */
async function pingSupabase() {
  let res;
  try {
    res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/listings?select=external_url,last_seen_at&limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
  } catch (err) {
    const error = new Error(`Could not reach ${parsedUrl.host} — ${describeError(err)}`);
    error.cause = err;
    error.hint = hintForNetworkError(err);
    throw error;
  }

  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    const error = new Error(`Supabase returned HTTP ${res.status} for the listings table${body ? `: ${body}` : ''}`);
    // 5xx and rate limits are worth retrying; 4xx means credentials or schema.
    error.retryable = res.status >= 500 || res.status === 429;
    if (res.status === 401 || res.status === 403) {
      error.hint = 'The SUPABASE_SERVICE_ROLE_KEY secret looks wrong or expired — regenerate it under Project Settings → API and update the repository secret.';
    } else if (body.includes('last_seen_at')) {
      // Selecting last_seen_at doubles as a schema check: the pipeline refreshes
      // it every run so the app can hide sold listings, and a table predating
      // that column would silently break the whole staleness mechanism.
      error.retryable = false;
      error.hint =
        'The `listings` table is missing the `last_seen_at` column. Paste ' +
        '`supabase/alter-add-last-seen-at.sql` into the Supabase SQL Editor and run it.';
    } else if (res.status === 404) {
      // PGRST205 means PostgREST cannot see the table — either it genuinely
      // does not exist, or its schema cache is stale (common right after a
      // paused project is restored).
      error.hint =
        'PostgREST cannot see the `listings` table. In the Supabase SQL Editor run ' +
        '`select count(*) from public.listings;` — if it errors, the table is missing, so run `supabase/schema.sql`. ' +
        'If it returns a count, the schema cache is stale: run `NOTIFY pgrst, \'reload schema\';` or restart the project ' +
        '(Settings → General → Restart project). Also confirm the project ref in NEXT_PUBLIC_SUPABASE_URL is the project you are looking at.';
    }
    throw error;
  }
}

function hintForNetworkError(err) {
  const code = errorCode(err);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return `DNS could not resolve ${parsedUrl.host}. Free-tier Supabase projects are paused after a week of inactivity, ` +
      'which removes the hostname — open the project dashboard and restore it, or update NEXT_PUBLIC_SUPABASE_URL if the project ref changed.';
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return `${parsedUrl.host} resolved but refused or dropped the connection — the project may be paused, restarting, or blocking this network.`;
  }
  if (code && code.startsWith('ERR_TLS')) {
    return 'TLS handshake failed — check the URL is the Supabase project URL and not a proxy.';
  }
  return null;
}

module.exports = { supabase, pingSupabase, SUPABASE_URL };
