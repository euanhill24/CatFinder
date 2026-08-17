// Parsing and validation of the scoring JSON the model returns.
//
// Kept separate from enrich.js so it can be tested without an API key: enrich.js
// requires ANTHROPIC_API_KEY at import time, which would keep these cases out of
// `npm test`.

const RATIONALE_KEYS = ['alone', 'friendly', 'vibe', 'distance', 'age'];

/**
 * A response we could not use. Flagged retryable: a malformed body is usually
 * model variance rather than a permanent fault, so another attempt is worth
 * more than dropping the listing. The payload is quoted so the run log says
 * what actually came back.
 * @param {string} reason
 * @param {string} payload
 * @returns {Error}
 */
function malformedResponse(reason, payload) {
  const err = new Error(`${reason} — model returned: ${payload.slice(0, 200)}`);
  err.retryable = true;
  return err;
}

/**
 * Parses the model's reply and checks it carries every field the caller reads.
 *
 * The scores are left to the caller to clamp; what matters here is that the
 * shape is complete. A body that parses but omits `rationale` used to throw a
 * bare TypeError deep in the caller — permanent, unretried, listing lost.
 * @param {string} raw - Response text, possibly fenced
 * @returns {{scores: object, rationale: Record<string, string>}}
 */
function parseScoreResponse(raw) {
  // Strip markdown code fences if present
  const text = String(raw)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw malformedResponse(err.message, text);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw malformedResponse('response was not a JSON object', text);
  }

  const rationale = parsed.rationale;
  if (!rationale || typeof rationale !== 'object') {
    throw malformedResponse('response is missing its rationale object', text);
  }

  const missing = RATIONALE_KEYS.filter(
    key => typeof rationale[key] !== 'string' || rationale[key].trim() === ''
  );
  if (missing.length > 0) {
    throw malformedResponse(`rationale is missing ${missing.join(', ')}`, text);
  }

  return {
    scores: parsed,
    rationale: Object.fromEntries(RATIONALE_KEYS.map(key => [key, rationale[key]])),
  };
}

module.exports = { parseScoreResponse, RATIONALE_KEYS };
