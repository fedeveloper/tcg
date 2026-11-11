import { expect, type Page } from "@playwright/test";

/** Opens the menu with short animations, so a full match takes less time. */
export async function openMenu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tcg.reducedMotion", "1");
    } catch {}
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Waits for the board canvas of a match. */
export async function waitForBoard(page: Page): Promise<void> {
  await expect(page.locator(".board canvas")).toBeVisible({ timeout: 30_000 });
}

/**
 * Plays the human side by passing or keeping the hand, until the result screen appears.
 * Returns the text of the result.
 */
export async function passUntilOver(page: Page, maxSteps = 600): Promise<string> {
  const over = page.locator(".over h2");
  const primary = page.locator(".me button.primary");
  for (let i = 0; i < maxSteps; i++) {
    if (await over.isVisible()) return (await over.textContent()) ?? "";
    if (await primary.isEnabled().catch(() => false)) await primary.click({ timeout: 2_000 }).catch(() => {});
    else await page.waitForTimeout(150);
  }
  throw new Error("the match did not end");
}
