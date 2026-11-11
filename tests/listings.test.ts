import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadSampleListings, sampleUrl } from "../fixtures/sample-listings";
import { createTestDb } from "./helpers/test-db";
import type { Db } from "@/server/db";
import {
  NotFoundError,
  decide,
  getCollectionStatus,
  getDeck,
  getSaved,
  undoDecision,
} from "@/server/listings";

const NOW = new Date("2026-11-11T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
});
beforeEach(async () => {
  await db.exec("truncate listings, collection_runs");
  await loadSampleListings(db, NOW);
});
afterAll(() => db.close());

const keyOf = (url: string) => url.split("/").pop();
const deckKeys = async (opts = {}) => (await getDeck(db, { now: NOW, ...opts })).cats.map((c) => keyOf(c.externalUrl));

async function idOf(key: string): Promise<string> {
  const [row] = await db.query<{ id: string }>("select id from listings where external_url = $1", [sampleUrl(key)]);
  return row.id;
}

describe("deck", () => {
  it("shows only eligible cats, best match first", async () => {
    // bella 9.3, pair 9.0, mochi 8.3, brighton 7.25, luna 6.15, no-photo 6.05, red-flag 5.1
    expect(await deckKeys()).toEqual(["bella", "pair", "mochi", "brighton", "luna", "no-photo", "red-flag"]);
  });

  it("is ordered by overall score, descending", async () => {
    const { cats } = await getDeck(db, { now: NOW });
    const scores = cats.map((c) => c.overall);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("hides kittens under the cut-off but shows cats of unknown age", async () => {
    const keys = await deckKeys();
    expect(keys).not.toContain("kitten");
    expect(keys).toContain("no-photo");
  });

  it("hides stale, reserved, non-ragdoll, unscored and duplicate listings", async () => {
    const keys = await deckKeys();
    for (const hidden of ["sold", "reserved", "not-ragdoll", "unscored", "bella-repost", "dismissed", "liked-live"]) {
      expect(keys).not.toContain(hidden);
    }
  });

  it("keeps hidden listings in the database", async () => {
    const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from listings");
    expect(n).toBe(16);
  });

  it("links a cat to its other adverts", async () => {
    const { cats } = await getDeck(db, { now: NOW });
    const bella = cats.find((c) => keyOf(c.externalUrl) === "bella")!;
    expect(bella.otherAdverts).toEqual([{ source: "gumtree", externalUrl: sampleUrl("bella-repost") }]);
  });

  it("returns a page but counts everything remaining", async () => {
    const deck = await getDeck(db, { now: NOW, limit: 3 });
    expect(deck.cats).toHaveLength(3);
    expect(deck.remaining).toBe(7);
  });

  it("tops up without repeating cards the phone already holds", async () => {
    const first = await getDeck(db, { now: NOW, limit: 3 });
    const next = await getDeck(db, { now: NOW, limit: 3, excludeIds: first.cats.map((c) => c.id) });
    expect(next.cats.map((c) => keyOf(c.externalUrl))).toEqual(["brighton", "luna", "no-photo"]);
  });

  it("counts cats new since the last visit", async () => {
    // First seen: bella 3h, red-flag 3h, no-photo 2h ago; the rest are older.
    expect((await getDeck(db, { now: NOW, lastVisitAt: hoursAgo(10) })).newSinceLastVisit).toBe(3);
    expect((await getDeck(db, { now: NOW, lastVisitAt: hoursAgo(0.5) })).newSinceLastVisit).toBe(0);
    // No recorded visit: everything is new.
    expect((await getDeck(db, { now: NOW })).newSinceLastVisit).toBe(7);
  });

  it("maps a full card", async () => {
    const { cats } = await getDeck(db, { now: NOW, limit: 1 });
    expect(cats[0]).toMatchObject({
      source: "pets4homes",
      title: "Bella, blue bicolour ragdoll, 3 years",
      pricePence: 45000,
      ageMonths: 38,
      sex: "female",
      location: "Edinburgh, Midlothian",
      photoUrls: ["/sample/cat-1.svg", "/sample/cat-2.svg", "/sample/cat-3.svg"],
      scores: { alone: 9, friendly: 9, vibe: 9, distance: 10, age: 10 },
      listedAt: hoursAgo(5).toISOString(),
    });
    expect(cats[0].overall).toBeCloseTo(9.3, 2);
    expect(cats[0].reasons.distance).toBe("In Edinburgh, so no real travel.");
  });
});

describe("decisions", () => {
  it("a liked cat leaves the deck and joins the saved list", async () => {
    await decide(db, await idOf("bella"), "liked", NOW);
    expect(await deckKeys()).not.toContain("bella");
    const saved = await getSaved(db, NOW);
    expect(keyOf(saved[0].externalUrl)).toBe("bella");
    expect(saved[0].likedAt).toBe(NOW.toISOString());
  });

  it("a dismissed cat leaves the deck and is not saved", async () => {
    await decide(db, await idOf("mochi"), "dismissed", NOW);
    expect(await deckKeys()).not.toContain("mochi");
    expect((await getSaved(db, NOW)).map((c) => keyOf(c.externalUrl))).not.toContain("mochi");
  });

  it("a decided cat stays out of the deck when it is seen again by collection", async () => {
    const id = await idOf("mochi");
    await decide(db, id, "dismissed", NOW);
    await db.query("update listings set last_seen_at = $2 where id = $1", [id, NOW]);
    expect(await deckKeys()).not.toContain("mochi");
  });

  it("undo puts the cat back where it was", async () => {
    const before = await deckKeys();
    const id = await idOf("pair");
    await decide(db, id, "liked", NOW);
    await undoDecision(db, id);
    expect(await deckKeys()).toEqual(before);
  });

  it("removing a saved cat dismisses it", async () => {
    await decide(db, await idOf("liked-live"), "dismissed", NOW);
    const saved = (await getSaved(db, NOW)).map((c) => keyOf(c.externalUrl));
    expect(saved).toEqual(["liked-gone"]);
    expect(await deckKeys()).not.toContain("liked-live");
  });

  it("reports an unknown id instead of silently doing nothing", async () => {
    await expect(decide(db, "00000000-0000-0000-0000-000000000000", "liked", NOW)).rejects.toThrow(NotFoundError);
  });
});

describe("saved list", () => {
  it("lists liked cats, most recently liked first", async () => {
    const saved = await getSaved(db, NOW);
    expect(saved.map((c) => keyOf(c.externalUrl))).toEqual(["liked-live", "liked-gone"]);
  });

  it("keeps a cat that is no longer listed, flagged as gone", async () => {
    const saved = await getSaved(db, NOW);
    expect(saved.map((c) => c.gone)).toEqual([false, true]);
  });

  it("flags a saved cat as gone when its advert is marked sold", async () => {
    await db.query("update listings set source_status = 'sold' where external_url = $1", [sampleUrl("liked-live")]);
    expect((await getSaved(db, NOW))[0].gone).toBe(true);
  });
});

describe("collection status", () => {
  it("reports when listings were last checked", async () => {
    expect(await getCollectionStatus(db, NOW)).toEqual({ lastCheckedAt: hoursAgo(1).toISOString(), overdue: false });
  });

  it("ignores failed and unfinished runs", async () => {
    await db.query("insert into collection_runs (started_at, finished_at, status) values ($1, $1, 'failed')", [NOW]);
    await db.query("insert into collection_runs (started_at, status) values ($1, 'running')", [NOW]);
    expect((await getCollectionStatus(db, NOW)).lastCheckedAt).toBe(hoursAgo(1).toISOString());
  });

  it("is overdue when nothing has succeeded for a day, or ever", async () => {
    const later = new Date(NOW.getTime() + 30 * 3_600_000);
    expect((await getCollectionStatus(db, later)).overdue).toBe(true);
    await db.query("delete from collection_runs");
    expect(await getCollectionStatus(db, NOW)).toEqual({ lastCheckedAt: null, overdue: true });
  });
});
