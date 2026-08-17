// Run with: node pipeline/score-response.test.js
const assert = require('assert');
const { parseScoreResponse } = require('./score-response');

const FULL = {
  score_alone: 8,
  score_friendly: 7,
  score_vibe: 6,
  score_distance: 10,
  score_age: 9,
  rationale: { alone: 'a', friendly: 'b', vibe: 'c', distance: 'd', age: 'e' },
};

// A well-formed reply comes back with scores and all five rationale strings
{
  const { scores, rationale } = parseScoreResponse(JSON.stringify(FULL));
  assert.strictEqual(scores.score_alone, 8);
  assert.deepStrictEqual(Object.keys(rationale).sort(), ['age', 'alone', 'distance', 'friendly', 'vibe']);
  assert.strictEqual(rationale.age, 'e');
}

// Markdown fences are stripped rather than breaking the parse
{
  const { rationale } = parseScoreResponse('```json\n' + JSON.stringify(FULL) + '\n```');
  assert.strictEqual(rationale.alone, 'a');
}

// Every rejection is retryable and quotes the payload, so withRetry gets
// another attempt and the run log says what came back
function assertRetryable(raw, matcher) {
  assert.throws(() => parseScoreResponse(raw), (err) => {
    assert.strictEqual(err.retryable, true, `should be retryable: ${err.message}`);
    assert.ok(err.message.includes('model returned:'), `should quote payload: ${err.message}`);
    assert.ok(matcher.test(err.message), `unexpected reason: ${err.message}`);
    return true;
  });
}

// Truncated body — what max_tokens: 512 used to produce
assertRetryable('{"score_alone":8,"rationale":{"alone":"tru', /JSON/i);

// Valid JSON with no rationale at all. This threw a bare, unretried
// TypeError in the caller and lost the listing outright.
assertRetryable(
  JSON.stringify({ score_alone: 8, score_friendly: 7, score_vibe: 6, score_distance: 10, score_age: 9 }),
  /missing its rationale object/
);

// Rationale present but incomplete — names the absent keys
assertRetryable(
  JSON.stringify({ ...FULL, rationale: { alone: 'a', friendly: 'b' } }),
  /missing vibe, distance, age/
);

// Blank strings are not usable rationale text
assertRetryable(
  JSON.stringify({ ...FULL, rationale: { ...FULL.rationale, vibe: '   ' } }),
  /missing vibe/
);

// Non-object bodies
assertRetryable('null', /not a JSON object/);
assertRetryable('"just a string"', /not a JSON object/);

console.log('score-response.test.js: all assertions passed');
