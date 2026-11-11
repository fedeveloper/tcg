import { expect, test } from "@playwright/test";
import { openMenu, passUntilOver, waitForBoard } from "./helpers.ts";

test("the tutorial starts the first lesson", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Tutorial" }).click();
  await page.getByRole("button", { name: /^Lezione 1/ }).click();
  await waitForBoard(page);
  await expect(page.locator(".lesson")).toContainText("Lezione 1");
  await expect(page.locator(".hand .card").first()).toBeVisible();
});

test("a match against the AI ends with a result and a reward", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Gioca", exact: true }).click();
  await waitForBoard(page);
  const result = await passUntilOver(page);
  expect(result.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.locator(".reward")).toBeVisible();
});

test("the deck editor saves a new deck", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Mazzi" }).click();
  await page.getByRole("button", { name: "Nuovo mazzo" }).click();
  await page.getByLabel("Nome del mazzo").fill("Prova E2E");
  const tiles = page.locator(".pool .tile:not(.dim)");
  for (let i = 0; i < 3; i++) await tiles.first().click();
  await expect(page.locator(".list .row")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText("Prova E2E")).toBeVisible();
});

test("two players play an online match with a code, and one concedes", async ({ browser }) => {
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  for (const p of [host, guest]) {
    await openMenu(p);
    await p.getByRole("button", { name: "Online" }).click();
    await expect(p.locator(".status.online")).toBeVisible({ timeout: 15_000 });
  }
  await host.getByRole("button", { name: "Crea una partita" }).click();
  const code = (await host.locator(".code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await guest.getByLabel("Codice di 6 caratteri").fill(code);
  await guest.getByRole("button", { name: "Entra" }).click();
  await waitForBoard(host);
  await waitForBoard(guest);
  await expect(host.locator("header .timer")).toBeVisible();

  host.once("dialog", (d) => void d.accept());
  await host.getByRole("button", { name: "Abbandona" }).click();
  await expect(host.locator(".over h2")).toContainText("Hai perso");
  await expect(guest.locator(".over h2")).toContainText("Hai vinto");
});

test("the keyboard plays a card and opens the card sheet", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Gioca", exact: true }).click();
  await waitForBoard(page);
  // The card sheet: right click on a card, Esc closes it.
  await page.locator(".hand .card").first().click({ button: "right" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // P confirms the mulligan.
  const primary = page.locator(".me button.primary");
  await expect(primary).toBeEnabled({ timeout: 20_000 });
  await page.keyboard.press("p");
  await expect(primary).not.toHaveText("Conferma", { timeout: 20_000 });
  // P passes until a card can be played.
  const playable = page.locator(".hand .card:not(.dim)");
  for (let i = 0; i < 60 && (await playable.count()) === 0; i++) {
    if (await page.locator(".me button.primary").isEnabled()) await page.keyboard.press("p");
    await page.waitForTimeout(300);
  }
  await expect(playable.first()).toBeVisible();
  const name = (await playable.first().locator(".sr-only").textContent())!.split(" (")[0]!;
  const copies = page.locator(".hand .card", { has: page.locator(".sr-only", { hasText: `${name} (` }) });
  const before = await copies.count();
  await playable.first().focus();
  await page.keyboard.press("Enter");
  // The choices of the board (slot, lane or target) are buttons too.
  for (let i = 0; i < 3; i++) {
    const choice = page.locator(".choices button").first();
    if (!(await choice.isVisible().catch(() => false))) break;
    await choice.focus();
    await page.keyboard.press("Enter");
  }
  await expect.poll(() => copies.count(), { timeout: 20_000 }).toBeLessThan(before);
});

test.describe("phone in portrait", () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  test("the hand is one row at the bottom and the cards stay playable", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("button", { name: "Gioca", exact: true }).click();
    await waitForBoard(page);
    const cards = page.locator(".hand .card");
    const first = await cards.first().boundingBox();
    const last = await cards.last().boundingBox();
    expect(Math.abs(first!.y - last!.y)).toBeLessThan(40);
    await expect(page.locator(".me button.primary")).toBeVisible();
    const width = await page.locator("html").evaluate((el) => el.scrollWidth);
    expect(width).toBeLessThanOrEqual(412);
  });
});
