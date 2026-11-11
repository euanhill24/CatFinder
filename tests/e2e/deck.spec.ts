import { expect, test } from "@playwright/test";
import { closeDb, decisionOf, openDeck, resetData, testDb, topCard, topTitle, touchSwipe } from "./helpers";

test.beforeEach(resetData);
test.afterAll(closeDb);

test("shows the best match first with counts @layout", async ({ page }) => {
  await openDeck(page);
  await expect(topTitle(page)).toHaveText(/Bella/);
  await expect(page.getByText(/to review/)).toContainText("7 new · 7 cats to review");
  await expect(page.getByRole("link", { name: "Saved cats (2)" })).toBeVisible();

  // Nothing overflows sideways, and the buttons are on screen.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toBeInViewport();
});

test("swiping right saves the cat and shows the next one", async ({ page }) => {
  await openDeck(page);
  await touchSwipe(page, "right");
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await expect(page.getByText(/to review/)).toContainText("6 new · 6 cats to review");
  await expect(page.getByRole("link", { name: "Saved cats (3)" })).toBeVisible();
  await expect.poll(() => decisionOf("bella")).toBe("liked");
});

test("swiping left dismisses the cat for good", async ({ page }) => {
  await openDeck(page);
  await touchSwipe(page, "left");
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await expect.poll(() => decisionOf("bella")).toBe("dismissed");

  await page.reload();
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await expect(page.getByText(/to review/)).toContainText("6 cats to review");
});

test("a short drag is not a decision", async ({ page }) => {
  await openDeck(page);
  await touchSwipe(page, "right", 40);
  await page.waitForTimeout(400);
  await expect(topTitle(page)).toHaveText(/Bella/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await decisionOf("bella")).toBeNull();
});

test("the buttons do the same as swiping", async ({ page }) => {
  await openDeck(page);
  await page.getByRole("button", { name: "Save", exact: true }).tap();
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await page.getByRole("button", { name: "Dismiss", exact: true }).tap();
  await expect(topTitle(page)).toHaveText(/Seal point/);
  await expect.poll(() => decisionOf("bella")).toBe("liked");
  await expect.poll(() => decisionOf("pair")).toBe("dismissed");
});

test("tapping opens the detail view, and back returns to the same card", async ({ page }) => {
  await openDeck(page);
  await topCard(page).tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Bella/);
  await expect(dialog).toContainText("In Edinburgh, so no real travel.");
  await expect(dialog).toContainText("£450");
  await expect(dialog).toContainText("She is the most laid-back cat");
  await expect(dialog.getByRole("link", { name: /View original advert/ })).toHaveAttribute("target", "_blank");
  await expect(dialog.getByRole("link", { name: /Also on Gumtree/ })).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(3);

  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(topTitle(page)).toHaveText(/Bella/);
  expect(await decisionOf("bella")).toBeNull();
});

test("a decision can be made from the detail view", async ({ page }) => {
  await openDeck(page);
  await topCard(page).tap();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await expect.poll(() => decisionOf("bella")).toBe("liked");
});

test("undo brings the last cat back", async ({ page }) => {
  await openDeck(page);
  const undo = page.getByRole("button", { name: "Undo last swipe" });
  await expect(undo).toBeDisabled();
  await touchSwipe(page, "left");
  await expect(topTitle(page)).toHaveText(/Bonded pair/);
  await expect.poll(() => decisionOf("bella")).toBe("dismissed");
  await undo.tap();
  await expect(topTitle(page)).toHaveText(/Bella/);
  await expect(page.getByText(/to review/)).toContainText("7 cats to review");
  await expect.poll(() => decisionOf("bella")).toBeNull();
});

test("says so when a swipe cannot be saved, and clears it once one saves", async ({ page }) => {
  await openDeck(page);
  await testDb().exec("alter table listings rename to listings_gone");
  try {
    await touchSwipe(page, "right");
    await expect(page.locator("main").getByRole("alert")).toContainText("wasn't saved, so that cat will come back");
  } finally {
    await testDb().exec("alter table listings_gone rename to listings");
  }
  await touchSwipe(page, "left");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

  await page.reload();
  await expect(topTitle(page)).toHaveText(/Bella/);
});

test("loads more cards as she goes, and ends caught up", async ({ page }) => {
  // 30 extra cats: more than one page.
  await testDb().exec(`
    insert into listings (source, external_url, title, age_months, score_alone, score_friendly, score_vibe,
                          score_distance, score_age, score_overall, score_reasons)
    select 'gumtree', 'https://example.com/extra/' || n, 'Extra cat ' || n, 30, 5, 5, 5, 5, 5, 4 - n * 0.01,
           '{"alone":"a","friendly":"f","vibe":"v","distance":"d","age":"g"}'::jsonb
    from generate_series(1, 30) n`);
  await openDeck(page);
  await expect(page.getByText(/to review/)).toContainText("37 cats to review");
  // Only a few cards are in the page at once.
  expect(await page.locator("article").count()).toBeLessThanOrEqual(2);

  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  for (let i = 37; i > 0; i--) {
    await expect(page.getByText(/to review/)).toContainText(`${i} cat${i === 1 ? "" : "s"} to review`);
    await dismiss.tap();
  }
  await expect(page.getByText("You're all caught up!")).toBeVisible();
  await expect(page.getByText(/Last checked 1h ago/)).toBeVisible();
  const [{ n }] = await testDb().query<{ n: number }>("select count(*)::int as n from listings where decision = 'dismissed'");
  expect(n).toBe(38);
});

test("counts only cats new since the last visit", async ({ context, page }) => {
  const sixHoursAgo = Date.now() - 6 * 3_600_000;
  await context.addCookies([{ name: "kt_seen", value: String(sixHoursAgo), url: "http://localhost:3210" }]);
  await openDeck(page);
  // Bella, the red-flag advert and the no-photo advert arrived in the last 6 hours.
  await expect(page.getByText(/to review/)).toContainText("3 new · 7 cats to review");
  // Still the same visit after a reload.
  await page.reload();
  await expect(page.getByText(/to review/)).toContainText("3 new · 7 cats to review");
});

test("shows the real reason when cats cannot be loaded, never an empty deck", async ({ page }) => {
  await testDb().exec("alter table listings rename to listings_gone");
  try {
    await page.goto("/");
    await expect(page.locator("main").getByRole("alert")).toContainText("Can't load cats right now");
    await expect(page.locator("main").getByRole("alert")).toContainText('relation "listings" does not exist');
    await expect(page.getByText("You're all caught up!")).toHaveCount(0);
  } finally {
    await testDb().exec("alter table listings_gone rename to listings");
  }
  await page.getByRole("button", { name: "Try again" }).tap();
  await expect(topTitle(page)).toHaveText(/Bella/);
});

test("warns when collection has not run for a day", async ({ page }) => {
  await testDb().exec("update collection_runs set finished_at = now() - interval '30 hours'");
  await openDeck(page);
  await expect(page.getByRole("status").filter({ hasText: "longer than usual" })).toBeVisible();
});

test("is installable and kept out of search engines", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThan(0);
  expect((await request.get(manifest.icons[0].src)).ok()).toBe(true);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("shows an offline page when opened with no connection", async ({ page, context }) => {
  await openDeck(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => caches.match("/offline").then((r) => !!r))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
});
