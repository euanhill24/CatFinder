require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are evaluating a cat listing for a young doctor in Edinburgh who works long hospital shifts. She wants a ragdoll cat that will be happy home alone during the day. She lives alone, so a calm, affectionate cat that handles solitude well is ideal. Older cats are preferred over kittens.

Score the listing on these 5 criteria from 0 to 10:

1. **alone** — How well-suited is this cat to being alone during working hours? Independent, settled cats score high. Kittens or cats described as needy/clingy score lower.
2. **friendly** — How affectionate and gentle does this cat seem? Friendly, cuddly temperament scores high.
3. **vibe** — Overall impression from description and photos. Does the cat look healthy, well-cared-for, and appealing?
4. **distance** — How far is this cat from Edinburgh? Use this guide:
   | Location | Score |
   |---|---|
   | Edinburgh / Lothians | 10 |
   | Central Scotland (Glasgow, Stirling, Perth) | 8 |
   | Northern Scotland | 7 |
   | Northern England (Newcastle, Leeds, Manchester) | 5 |
   | Midlands | 4 |
   | London / South East | 2 |
   | South West / Wales | 2 |
   | Far south coast (Brighton, Bournemouth) | 1 |
5. **age** — How suitable is the cat's age? Use this guide:
   | Age | Score |
   |---|---|
   | 2–6 years | 10 |
   | 6 months – 2 years | 7 |
   | 6+ years | 8 |
   | Under 6 months (kitten) | 4 |
   | Unknown | 5 |

For each score, provide a one-sentence rationale that reads as a natural observation about the cat. Do not mention scoring, algorithms, or AI.

Return ONLY a JSON object with this exact shape, no other text:
{"score_alone":0,"score_friendly":0,"score_vibe":0,"score_distance":0,"score_age":0,"rationale":{"alone":"...","friendly":"...","vibe":"...","distance":"...","age":"..."}}`;

function clamp(val) {
  return Math.min(10, Math.max(0, Number(val) || 0));
}

/**
 * @param {object} listing - Raw listing from scraper
 * @param {string} listing.description
 * @param {string} listing.location_raw
 * @param {number|null} listing.age_months
 * @param {string[]} listing.photo_urls
 * @param {string} listing.sex
 * @returns {Promise<object>}
 */
async function enrichListing(listing) {
  const userContent = [];

  // Add first photo if available
  if (listing.photo_urls && listing.photo_urls.length > 0) {
    userContent.push({
      type: 'image',
      source: { type: 'url', url: listing.photo_urls[0] },
    });
  }

  // Build text description
  const parts = [];
  parts.push(`Description: ${listing.description || 'No description provided.'}`);
  parts.push(`Location: ${listing.location_raw || 'Unknown'}`);
  parts.push(`Sex: ${listing.sex || 'unknown'}`);
  if (listing.age_months != null) {
    parts.push(`Age: ${listing.age_months} months`);
  } else {
    parts.push('Age: Unknown');
  }

  userContent.push({ type: 'text', text: parts.join('\n') });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = response.content[0].text.trim();
  const parsed = JSON.parse(text);

  const score_alone = clamp(parsed.score_alone);
  const score_friendly = clamp(parsed.score_friendly);
  const score_vibe = clamp(parsed.score_vibe);
  const score_distance = clamp(parsed.score_distance);
  const score_age = clamp(parsed.score_age);

  const score_overall = Math.round((
    score_alone * 0.35 +
    score_friendly * 0.20 +
    score_vibe * 0.15 +
    score_distance * 0.15 +
    score_age * 0.15
  ) * 10) / 10;

  return {
    score_alone,
    score_friendly,
    score_vibe,
    score_distance,
    score_age,
    score_overall,
    score_rationale: {
      alone: parsed.rationale.alone,
      friendly: parsed.rationale.friendly,
      vibe: parsed.rationale.vibe,
      distance: parsed.rationale.distance,
      age: parsed.rationale.age,
    },
  };
}

module.exports = { enrichListing };
