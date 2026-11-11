import { expect, test } from "@playwright/test";
import { closeDb, decisionOf, openDeck, resetData, testDb } from "./helpers";

test.beforeEach(resetData);
test.afterAll(closeDb);

test("lists saved cats, newest first, and keeps ones that have gone @layout", async ({ page }) => {
  await page.goto("/saved");
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Oscar");
  await expect(rows.nth(0)).toContainText("Messaged the seller");
  await expect(rows.nth(0)).not.toContainText("No longer listed");
  await expect(rows.nth(1)).toContainText("Willow");
  await expect(rows.nth(1)).toContainText("No longer listed");
  await expect(rows.nth(0).getByRole("link", { name: /View listing/ })).toHaveAttribute(
    "href",
    "https://example.com/sample-listing/liked-live",
  );
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("is one tap from the deck and shows a newly liked cat first", async ({ page }) => {
  await openDeck(page);
  await page.getByRole("button", { name: "Save", exact: true }).tap();
  await expect.poll(() => decisionOf("bella")).toBe("liked");
  await page.getByRole("link", { name: /Saved cats/ }).tap();
  await expect(page.getByRole("listitem").first()).toContainText("Bella");
  await page.getByRole("link", { name: "Back to the deck" }).tap();
  await expect(page.getByText(/to review/)).toContainText("6 cats to review");

  // Going back and forth always shows the current list, not a remembered one.
  await page.getByRole("button", { name: "Save", exact: true }).tap();
  await expect.poll(() => decisionOf("pair")).toBe("liked");
  await page.getByRole("link", { name: /Saved cats/ }).tap();
  await expect(page.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("listitem").first()).toContainText("Bonded pair");
});

test("opens the detail view and saves a note", async ({ page }) => {
  await page.goto("/saved");
  await page.getByRole("listitem").nth(1).getByRole("button").tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Willow/);
  await expect(dialog).toContainText("No longer listed");
  await dialog.getByRole("textbox", { name: "Your note" }).fill("Rang twice, no answer");
  await dialog.getByRole("button", { name: "Save note" }).tap();
  await expect(dialog.getByRole("status")).toHaveText("Saved");
  await page.goBack();
  await expect(page.getByRole("listitem").nth(1)).toContainText("Rang twice, no answer");
  const [row] = await testDb().query<{ note: string }>("select note from listings where external_url like '%/liked-gone'");
  expect(row.note).toBe("Rang twice, no answer");
});

test("removing a saved cat takes two taps and dismisses it", async ({ page }) => {
  await page.goto("/saved");
  await page.getByRole("listitem").first().getByRole("button").tap();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Remove from saved" }).tap();
  expect(await decisionOf("liked-live")).toBe("liked");
  await dialog.getByRole("button", { name: "Tap again to remove" }).tap();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect.poll(() => decisionOf("liked-live")).toBe("dismissed");
});

test("explains itself when empty", async ({ page }) => {
  await testDb().exec("update listings set decision = 'dismissed' where decision = 'liked'");
  await page.goto("/saved");
  await expect(page.getByText("No saved cats yet")).toBeVisible();
});
