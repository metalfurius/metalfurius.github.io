import { test, expect } from "@playwright/test";

test.skip(!process.env.CANONICAL_LIVE, "Canonical live checks run only after a main deployment.");

const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 }
];

async function assertNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth, `horizontal overflow at ${dimensions.clientWidth}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function chooseLanguage(page, language, viewportWidth) {
  if (language === "es") {
    if (viewportWidth <= 768) await page.locator(".menu-toggle").click();
    await page.locator("#lang-es").click();
    if (viewportWidth <= 768) await page.locator(".menu-toggle").click();
  }
  await expect(page.locator("html")).toHaveAttribute("lang", language);
}

for (const language of ["en", "es"]) {
  for (const viewport of viewports) {
    test(`${language} ${viewport.width}px canonical layout and journey`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await chooseLanguage(page, language, viewport.width);
      await expect(page.locator(".hero-content")).toBeVisible();
      await expect(page.locator("#projects")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const menu = page.locator(".menu-toggle");
      const navigation = page.locator("#primary-navigation");
      if (viewport.width <= 768) {
        await menu.click();
        await expect(navigation).toBeVisible();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        await menu.click();
      } else {
        await expect(menu).toBeHidden();
        await expect(navigation).toBeVisible();
      }

      const trigger = page.locator('[data-project="project-1"] .project-button');
      const dialog = page.locator("#project-1");
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-labelledby", "project-1-modal-title");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
}

test("canonical no-JS fallback remains usable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".hero-content")).toBeVisible();
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator("#primary-navigation")).toBeVisible();
  await expect(page.locator(".language-switcher")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await context.close();
});

test("canonical reduced-motion journey remains usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await expect(page.locator(".hero-content")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
