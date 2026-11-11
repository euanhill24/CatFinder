import { overallScore, type Scores } from "@/core/rules";
import type { Decision, ScoreReasons, Sex, SourceStatus } from "@/core/types";
import type { Db } from "@/server/db";

/**
 * Sample cats for building and testing the app before real collection exists.
 * They cover the awkward cases the deck has to handle. Times are relative to
 * "now" so the set stays valid whenever it is loaded.
 */
export interface SampleListing {
  key: string;
  source: "pets4homes" | "gumtree";
  title: string | null;
  pricePence: number | null;
  ageMonths: number | null;
  sex: Sex;
  location: string | null;
  description: string | null;
  photos: number[];
  /** Hours before now. */
  listedHoursAgo: number | null;
  firstSeenHoursAgo: number;
  lastSeenHoursAgo: number;
  sourceStatus?: SourceStatus;
  isRagdoll?: boolean;
  duplicateOfKey?: string;
  scores: Scores | null;
  reasons: ScoreReasons | null;
  decision?: Decision;
  decidedHoursAgo?: number;
}

const LONG_DESCRIPTION = `Bella is a stunning blue bicolour ragdoll who has been with us since she was a kitten. Sadly we are relocating abroad for work and cannot take her with us, which is breaking our hearts.

She is the most laid-back cat we have ever owned. She sleeps most of the day in her favourite spot on the windowsill and is perfectly content when we are out at work. When we get home she will trot to the door, flop at our feet and ask for a belly rub.

Bella is fully vaccinated, microchipped, spayed and up to date with flea and worm treatment. She has always been an indoor cat. She is fine with visitors but has never lived with dogs or other cats, so we think she would be happiest as an only pet.

She comes with her scratching post, bed, carrier, bowls, litter tray and a month of her usual food. We are looking for a calm, loving home and will ask a few questions to make sure she goes to the right person. Viewings are welcome any evening or weekend.

Please, no time wasters. She is a much-loved member of our family and we want the very best for her.`;

function reasons(alone: string, friendly: string, vibe: string, distance: string, age: string): ScoreReasons {
  return { alone, friendly, vibe, distance, age };
}

export const SAMPLE_LISTINGS: SampleListing[] = [
  {
    key: "bella",
    source: "pets4homes",
    title: "Bella, blue bicolour ragdoll, 3 years",
    pricePence: 45000,
    ageMonths: 38,
    sex: "female",
    location: "Edinburgh, Midlothian",
    description: LONG_DESCRIPTION,
    photos: [1, 2, 3],
    listedHoursAgo: 5,
    firstSeenHoursAgo: 3,
    lastSeenHoursAgo: 1,
    scores: { alone: 9, friendly: 9, vibe: 9, distance: 10, age: 10 },
    reasons: reasons(
      "Sleeps on the windowsill all day and is content while her owners are at work.",
      "Trots to the door and flops over for a belly rub when they get home.",
      "Vaccinated, chipped and clearly adored. A calm, well-kept cat.",
      "In Edinburgh, so no real travel.",
      "Three years old and well past the kitten stage.",
    ),
  },
  {
    key: "mochi",
    source: "gumtree",
    title: "Seal point ragdoll boy needs a quiet home",
    pricePence: 30000,
    ageMonths: 60,
    sex: "male",
    location: "Stirling",
    description:
      "Mochi is 5 and very chilled. Used to being on his own during the day as I work full time. Selling due to a new baby with allergies. Neutered and chipped.",
    photos: [2],
    listedHoursAgo: 30,
    firstSeenHoursAgo: 28,
    lastSeenHoursAgo: 1,
    scores: { alone: 9, friendly: 7, vibe: 7, distance: 8, age: 10 },
    reasons: reasons(
      "Already used to a full working day on his own.",
      "Described as very chilled, though not much is said about cuddles.",
      "Neutered and chipped, with a sensible reason for rehoming.",
      "Stirling is about an hour from Edinburgh.",
      "Five years old and settled.",
    ),
  },
  {
    key: "luna",
    source: "pets4homes",
    title: "Luna",
    pricePence: null,
    ageMonths: 14,
    sex: "female",
    location: "Glasgow",
    description: "Lovely ragdoll girl, 14 months. Very playful and follows me everywhere, hates being left. Message for details.",
    photos: [3, 4],
    listedHoursAgo: 50,
    firstSeenHoursAgo: 49,
    lastSeenHoursAgo: 1,
    scores: { alone: 3, friendly: 9, vibe: 7, distance: 8, age: 7 },
    reasons: reasons(
      "Follows her owner everywhere and hates being left.",
      "Playful and very attached to people.",
      "Sweet-sounding, but the advert is short on detail.",
      "Glasgow is about an hour away.",
      "Just over a year old, still quite lively.",
    ),
  },
  {
    key: "no-photo",
    source: "gumtree",
    title: "Ragdoll cross, adult female",
    pricePence: 15000,
    ageMonths: null,
    sex: "female",
    location: "Newcastle upon Tyne",
    description: "Adult ragdoll cross looking for a new home. Quiet and independent. No photos at the moment, can send on request.",
    photos: [],
    listedHoursAgo: null,
    firstSeenHoursAgo: 2,
    lastSeenHoursAgo: 1,
    scores: { alone: 8, friendly: 5, vibe: 5, distance: 5, age: 5 },
    reasons: reasons(
      "Described as quiet and independent.",
      "Nothing in the advert about how affectionate she is.",
      "No photos to go on, and very little detail.",
      "Newcastle is around two hours away.",
      "Age isn't given beyond adult.",
    ),
  },
  {
    key: "pair",
    source: "pets4homes",
    title: "Bonded pair of ragdoll brothers",
    pricePence: 60000,
    ageMonths: 30,
    sex: "male",
    location: "Perth",
    description: "Two brothers, 2.5 years old, must stay together. They keep each other company while we are out. Both neutered, vaccinated and insured.",
    photos: [5, 6],
    listedHoursAgo: 70,
    firstSeenHoursAgo: 68,
    lastSeenHoursAgo: 1,
    scores: { alone: 10, friendly: 8, vibe: 8, distance: 8, age: 10 },
    reasons: reasons(
      "They keep each other company while the owners are out.",
      "Described as a close, gentle pair.",
      "Neutered, vaccinated and insured.",
      "Perth is about an hour away.",
      "Two and a half years old.",
    ),
  },
  {
    key: "red-flag",
    source: "gumtree",
    title: "RAGDOLL MUST GO TODAY",
    pricePence: 8000,
    ageMonths: 24,
    sex: "unknown",
    location: "Manchester",
    description: "Ragdoll 2 years old must go today, cash only, no vaccinations. Collection only.",
    photos: [4],
    listedHoursAgo: 4,
    firstSeenHoursAgo: 3,
    lastSeenHoursAgo: 1,
    scores: { alone: 5, friendly: 4, vibe: 2, distance: 5, age: 10 },
    reasons: reasons(
      "Nothing is said about how the cat copes alone.",
      "No description of temperament at all.",
      "Must go today, cash only and unvaccinated, at an unusually low price.",
      "Manchester is a long drive or a train ride.",
      "Two years old.",
    ),
  },
  {
    key: "brighton",
    source: "pets4homes",
    title: "Gentle lilac ragdoll, Brighton",
    pricePence: 50000,
    ageMonths: 48,
    sex: "female",
    location: "Brighton, East Sussex",
    description: "Four-year-old lilac ragdoll. Calm and affectionate, happy on her own during the day.",
    photos: [6],
    listedHoursAgo: 100,
    firstSeenHoursAgo: 98,
    lastSeenHoursAgo: 1,
    scores: { alone: 8, friendly: 8, vibe: 8, distance: 1, age: 10 },
    reasons: reasons(
      "Happy on her own during the day.",
      "Calm and affectionate.",
      "A tidy advert for a well-kept cat.",
      "Brighton is the far end of the country.",
      "Four years old.",
    ),
  },
  // --- Cats that must NOT appear in the deck ---
  {
    key: "kitten",
    source: "pets4homes",
    title: "Ragdoll kittens ready now",
    pricePence: 85000,
    ageMonths: 3,
    sex: "male",
    location: "Edinburgh",
    description: "Gorgeous ragdoll kittens, 12 weeks old, ready to leave.",
    photos: [1],
    listedHoursAgo: 2,
    firstSeenHoursAgo: 2,
    lastSeenHoursAgo: 1,
    scores: { alone: 2, friendly: 9, vibe: 9, distance: 10, age: 4 },
    reasons: reasons(
      "A twelve-week-old kitten needs company through the day.",
      "Playful and used to being handled.",
      "Healthy-looking litter.",
      "In Edinburgh.",
      "Only twelve weeks old.",
    ),
  },
  {
    key: "sold",
    source: "gumtree",
    title: "Ragdoll girl, 2 years (advert removed)",
    pricePence: 40000,
    ageMonths: 24,
    sex: "female",
    location: "Dundee",
    description: "Lovely ragdoll girl. This advert has not been seen for over a week.",
    photos: [2],
    listedHoursAgo: 24 * 20,
    firstSeenHoursAgo: 24 * 19,
    lastSeenHoursAgo: 24 * 9,
    scores: { alone: 8, friendly: 8, vibe: 8, distance: 7, age: 10 },
    reasons: reasons("Settled.", "Affectionate.", "Well kept.", "Dundee is under two hours away.", "Two years old."),
  },
  {
    key: "reserved",
    source: "pets4homes",
    title: "Ragdoll boy, reserved",
    pricePence: 40000,
    ageMonths: 36,
    sex: "male",
    location: "Falkirk",
    description: "Now reserved.",
    photos: [3],
    listedHoursAgo: 60,
    firstSeenHoursAgo: 58,
    lastSeenHoursAgo: 1,
    sourceStatus: "reserved",
    scores: { alone: 8, friendly: 8, vibe: 7, distance: 8, age: 10 },
    reasons: reasons("Settled.", "Friendly.", "Fine.", "Falkirk is close.", "Three years old."),
  },
  {
    key: "not-ragdoll",
    source: "gumtree",
    title: "Ragdoll-style cat tree and toys",
    pricePence: 2500,
    ageMonths: null,
    sex: "unknown",
    location: "Leith",
    description: "Large cat tree, suit ragdoll or other big breed.",
    photos: [],
    listedHoursAgo: 6,
    firstSeenHoursAgo: 5,
    lastSeenHoursAgo: 1,
    isRagdoll: false,
    scores: null,
    reasons: null,
  },
  {
    key: "unscored",
    source: "gumtree",
    title: "Ragdoll, details to follow",
    pricePence: null,
    ageMonths: 18,
    sex: "female",
    location: "Livingston",
    description: "Waiting to be scored.",
    photos: [5],
    listedHoursAgo: 1,
    firstSeenHoursAgo: 1,
    lastSeenHoursAgo: 1,
    scores: null,
    reasons: null,
  },
  {
    key: "bella-repost",
    source: "gumtree",
    title: "Blue bicolour ragdoll Bella 3yrs",
    pricePence: 45000,
    ageMonths: 38,
    sex: "female",
    location: "Edinburgh",
    description: "Same cat as the Pets4Homes advert, posted again on Gumtree.",
    photos: [1],
    listedHoursAgo: 2,
    firstSeenHoursAgo: 2,
    lastSeenHoursAgo: 1,
    duplicateOfKey: "bella",
    scores: { alone: 9, friendly: 9, vibe: 9, distance: 10, age: 10 },
    reasons: reasons("Same cat.", "Same cat.", "Same cat.", "Same cat.", "Same cat."),
  },
  // --- Already decided ---
  {
    key: "liked-live",
    source: "pets4homes",
    title: "Oscar, mitted ragdoll, 4 years",
    pricePence: 35000,
    ageMonths: 50,
    sex: "male",
    location: "Dunfermline, Fife",
    description: "Oscar is a gentle giant who loves a lap in the evening and snoozes all day.",
    photos: [5, 1],
    listedHoursAgo: 80,
    firstSeenHoursAgo: 78,
    lastSeenHoursAgo: 1,
    scores: { alone: 9, friendly: 9, vibe: 8, distance: 8, age: 10 },
    reasons: reasons(
      "Snoozes all day.",
      "Loves a lap in the evening.",
      "A relaxed, well-kept cat.",
      "Fife is just over the bridge.",
      "Four years old.",
    ),
    decision: "liked",
    decidedHoursAgo: 20,
  },
  {
    key: "liked-gone",
    source: "gumtree",
    title: "Willow, ragdoll, 6 years",
    pricePence: 20000,
    ageMonths: 72,
    sex: "female",
    location: "Linlithgow",
    description: "Willow is a quiet older lady.",
    photos: [6],
    listedHoursAgo: 24 * 15,
    firstSeenHoursAgo: 24 * 14,
    lastSeenHoursAgo: 24 * 8,
    scores: { alone: 9, friendly: 7, vibe: 7, distance: 10, age: 8 },
    reasons: reasons("Quiet and settled.", "Gentle.", "Looks well.", "Very close.", "Six years old."),
    decision: "liked",
    decidedHoursAgo: 24 * 10,
  },
  {
    key: "dismissed",
    source: "pets4homes",
    title: "Ragdoll, Cornwall",
    pricePence: 70000,
    ageMonths: 12,
    sex: "male",
    location: "Truro, Cornwall",
    description: "One-year-old ragdoll boy.",
    photos: [4],
    listedHoursAgo: 40,
    firstSeenHoursAgo: 39,
    lastSeenHoursAgo: 1,
    scores: { alone: 6, friendly: 7, vibe: 7, distance: 2, age: 7 },
    reasons: reasons("Fairly independent.", "Friendly.", "Fine.", "Cornwall is a very long way.", "One year old."),
    decision: "dismissed",
    decidedHoursAgo: 30,
  },
];

export function sampleUrl(key: string): string {
  return `https://example.com/sample-listing/${key}`;
}

/** Loads the sample set. Safe to run again: existing rows are left alone. */
export async function loadSampleListings(db: Db, now: Date = new Date()): Promise<void> {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

  for (const s of SAMPLE_LISTINGS) {
    await db.query(
      `insert into listings (
         source, external_url, title, price_pence, age_months, sex, location_raw, description,
         photo_urls, listed_at, first_seen_at, last_seen_at, source_status, is_ragdoll,
         score_alone, score_friendly, score_vibe, score_distance, score_age, score_overall,
         score_reasons, scored_at, decision, decided_at
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8,
         array(select jsonb_array_elements_text($9::text::jsonb)), $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19, $20,
         $21::text::jsonb, $22, $23, $24
       )
       on conflict (external_url) do nothing`,
      [
        s.source,
        sampleUrl(s.key),
        s.title,
        s.pricePence,
        s.ageMonths,
        s.sex,
        s.location,
        s.description,
        JSON.stringify(s.photos.map((n) => `/sample/cat-${n}.svg`)),
        s.listedHoursAgo == null ? null : ago(s.listedHoursAgo),
        ago(s.firstSeenHoursAgo),
        ago(s.lastSeenHoursAgo),
        s.sourceStatus ?? "listed",
        s.isRagdoll ?? true,
        s.scores?.alone ?? null,
        s.scores?.friendly ?? null,
        s.scores?.vibe ?? null,
        s.scores?.distance ?? null,
        s.scores?.age ?? null,
        s.scores ? overallScore(s.scores) : null,
        s.reasons ? JSON.stringify(s.reasons) : null,
        s.scores ? ago(s.firstSeenHoursAgo) : null,
        s.decision ?? null,
        s.decidedHoursAgo == null ? null : ago(s.decidedHoursAgo),
      ],
    );
  }

  for (const s of SAMPLE_LISTINGS.filter((x) => x.duplicateOfKey)) {
    await db.query(
      `update listings set duplicate_of = (select id from listings where external_url = $2)
       where external_url = $1`,
      [sampleUrl(s.key), sampleUrl(s.duplicateOfKey!)],
    );
  }

  await db.query(
    `insert into collection_runs (started_at, finished_at, status, sources)
     select $1, $2, 'ok', '{"sample": {"seen": 16, "new": 16, "scored": 14, "failed": 0}}'::jsonb
     where not exists (select 1 from collection_runs)`,
    [ago(1.1), ago(1)],
  );
}
