/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import { waitForBoard } from "./helpers.ts";

/**
 * Frame rate of a match on a phone (plan, section 7.5: 60 fps on a mid-range phone of 2022).
 * The test slows the CPU 4 times, as a mid-range phone, and plays with full animations.
 * The test runs only with PERF=1, because the result depends on the machine: `PERF=1 pnpm e2e perf`.
 */
test.skip(!process.env.PERF, "set PERF=1 to measure the frame rate");
test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

test("a match on a slow phone keeps the frame rate", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Gioca$/ }).first().click();
  await waitForBoard(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const w = window as unknown as { frames_: number[] };
    w.frames_ = [];
    let last = performance.now();
    const loop = (t: number) => {
      w.frames_.push(t - last);
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const primary = page.locator(".me button.primary");
  const over = page.locator(".over h2");
  const end = Date.now() + 30_000;
  while (Date.now() < end && !(await over.isVisible())) {
    if (await primary.isEnabled().catch(() => false)) await primary.click({ timeout: 2_000 }).catch(() => {});
    else await page.waitForTimeout(200);
  }
  const frames = await page.evaluate(() => (window as unknown as { frames_: number[] }).frames_.slice(5));
  const total = frames.reduce((a, b) => a + b, 0);
  const fps = (frames.length / total) * 1000;
  const sorted = [...frames].sort((a, b) => a - b);
  const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
  console.log(`fps ${fps.toFixed(1)}, p99 frame ${p99.toFixed(1)} ms, frames over 50 ms: ${frames.filter((f) => f > 50).length}`);
  expect(fps).toBeGreaterThan(50);
  expect(p99).toBeLessThan(70);
});
