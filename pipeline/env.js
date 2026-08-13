// `quiet` suppresses dotenv's banner — in CI there is no .env.local and the
// tip it prints just adds noise to the job log.
require('dotenv').config({
  path: require('path').resolve(__dirname, '..', '.env.local'),
  quiet: true,
});

/**
 * Reads an env var, trimming surrounding whitespace. Secrets pasted into
 * GitHub Actions often carry a trailing newline, which turns a valid URL into
 * an unfetchable one.
 * @param {string} name
 * @returns {string|null}
 */
function getEnv(name) {
  const raw = process.env[name];
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Write back so anything reading process.env directly sees the clean value.
  process.env[name] = trimmed;
  return trimmed;
}

/**
 * Reads required env vars, failing with one message that names all the
 * missing ones rather than dying on the first.
 * @param {string[]} names
 * @returns {Record<string, string>}
 */
function requireEnv(names) {
  const values = {};
  const missing = [];

  for (const name of names) {
    const value = getEnv(name);
    if (value === null) missing.push(name);
    else values[name] = value;
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
      'Set them in .env.local locally, or as repository secrets for the GitHub Actions run.'
    );
  }

  return values;
}

module.exports = { getEnv, requireEnv };
