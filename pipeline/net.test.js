// Run with: node pipeline/net.test.js
const assert = require('assert');
const { describeError, errorCode, isRetryable, withRetry } = require('./net');

function fetchFailed(code, message) {
  const cause = new Error(message);
  cause.code = code;
  return new TypeError('fetch failed', { cause });
}

// describeError unwraps the cause chain that `fetch failed` hides
{
  const err = fetchFailed('ENOTFOUND', 'getaddrinfo ENOTFOUND abc.supabase.co');
  const description = describeError(err);
  assert.ok(description.includes('fetch failed'), description);
  assert.ok(description.includes('ENOTFOUND'), description);
  assert.ok(description.includes('abc.supabase.co'), description);
  assert.strictEqual(errorCode(err), 'ENOTFOUND');
}

// Transient codes retry; a bad hostname is permanent and must not
{
  assert.strictEqual(isRetryable(fetchFailed('ECONNRESET', 'socket reset')), true);
  assert.strictEqual(isRetryable(fetchFailed('EAI_AGAIN', 'temporary dns failure')), true);
  assert.strictEqual(isRetryable(fetchFailed('ENOTFOUND', 'no such host')), false);
}

// supabase-js loses the cause chain, so the flattened message must still retry
{
  assert.strictEqual(isRetryable(new Error('TypeError: fetch failed')), true);
  assert.strictEqual(isRetryable(new Error('duplicate key value violates unique constraint')), false);
}

// Explicit retryable flag wins over inference (used for HTTP status codes)
{
  const serverError = Object.assign(new Error('HTTP 503'), { retryable: true });
  const authError = Object.assign(new Error('HTTP 401 fetch failed'), { retryable: false });
  assert.strictEqual(isRetryable(serverError), true);
  assert.strictEqual(isRetryable(authError), false);
}

(async () => {
  // Retries transient failures, then succeeds
  {
    let calls = 0;
    const result = await withRetry('flaky', async () => {
      calls++;
      if (calls < 3) throw fetchFailed('ECONNRESET', 'socket reset');
      return 'ok';
    }, { baseDelayMs: 1, log: () => {} });
    assert.strictEqual(result, 'ok');
    assert.strictEqual(calls, 3);
  }

  // Gives up after the attempt budget and rethrows the last error
  {
    let calls = 0;
    await assert.rejects(
      withRetry('always down', async () => {
        calls++;
        throw fetchFailed('ETIMEDOUT', 'connect timeout');
      }, { attempts: 3, baseDelayMs: 1, log: () => {} }),
      /fetch failed/
    );
    assert.strictEqual(calls, 3);
  }

  // Permanent failures fail on the first attempt — no pointless backoff
  {
    let calls = 0;
    await assert.rejects(
      withRetry('bad host', async () => {
        calls++;
        throw fetchFailed('ENOTFOUND', 'no such host');
      }, { baseDelayMs: 1, log: () => {} }),
      /fetch failed/
    );
    assert.strictEqual(calls, 1);
  }

  console.log('net.test.js: all assertions passed');
})();
