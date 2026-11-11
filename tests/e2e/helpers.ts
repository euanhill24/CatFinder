import { expect, type Page } from "@playwright/test";
import { migrate } from "../../db/migrate";
import { loadSampleListings } from "../../fixtures/sample-listings";
import { connect, type Db } from "../../src/server/db";

let db: Db | undefined;

export function testDb(): Db {
  db ??= connect(process.env.E2E_DATABASE_URL!);
  return db;
}

/** Wipes the database and loads the sample cats. */
export async function resetData(): Promise<void> {
  const d = testDb();
  await migrate(d);
  await d.exec("truncate listings, collection_runs");
  await loadSampleListings(d);
}

export async function closeDb(): Promise<void> {
  await db?.close();
  db = undefined;
}

/** The card on top of the deck. */
export function topCard(page: Page) {
  return page.getByRole("button", { name: /Open for details/ });
}

export async function openDeck(page: Page): Promise<void> {
  await page.goto("/");
  await expect(topCard(page)).toBeVisible();
}

export function topTitle(page: Page) {
  return topCard(page).getByRole("heading");
}

/** Drags the top card sideways with a real touch sequence. */
export async function touchSwipe(page: Page, direction: "left" | "right", distance = 220): Promise<void> {
  const box = (await topCard(page).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const dx = direction === "right" ? distance : -distance;
  const cdp = await page.context().newCDPSession(page);
  const point = (px: number) => [{ x: px, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x + (dx * i) / 8) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export async function decisionOf(key: string): Promise<string | null> {
  const [row] = await testDb().query<{ decision: string | null }>(
    "select decision from listings where external_url like $1",
    [`%/${key}`],
  );
  return row.decision;
}
