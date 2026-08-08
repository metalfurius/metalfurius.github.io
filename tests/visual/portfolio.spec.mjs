import { test, expect } from "@playwright/test";

const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 }
];

async function waitForStablePage(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    for (const image of images) {
      image.scrollIntoView({ block: "center", inline: "nearest" });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
    const imagesReady = Promise.all(images.map((image) => image.complete ? undefined : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })));
    await Promise.race([imagesReady, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  });
  await page.waitForTimeout(100);
}

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
    test(`${language} ${viewport.width}px baseline and core journeys`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await chooseLanguage(page, language, viewport.width);
      await waitForStablePage(page);

      await expect(page.locator(".hero-content")).toBeVisible();
      await expect(page.locator("#projects")).toBeVisible();
      await expect(page.locator(".site-footer")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await expect(page).toHaveScreenshot(`portfolio-${language}-${viewport.width}.png`, { fullPage: true });

      const menu = page.locator(".menu-toggle");
      const panel = page.locator("#primary-navigation");
      if (viewport.width <= 768) {
        await expect(menu).toBeVisible();
        await menu.click();
        await expect(panel).toBeVisible();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        await panel.getByRole("link", { name: language === "es" ? "Proyectos" : "Projects" }).click();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
      } else {
        await expect(menu).toBeHidden();
        await expect(panel).toBeVisible();
      }

      const trigger = page.locator('[data-project="project-1"] .project-button');
      const dialog = page.locator("#project-1");
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-labelledby", "project-1-modal-title");
      await expect(dialog.locator(".close-modal")).toBeFocused();
      if (viewport.width === 320 || viewport.width === 1440) {
        await expect(page).toHaveScreenshot(`portfolio-${language}-${viewport.width}-modal.png`, { fullPage: false });
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
}

for (const viewport of viewports) {
  test(`no-JS fallback ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport,
      colorScheme: "dark"
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".hero-content")).toBeVisible();
    await expect(page.locator("#projects")).toBeVisible();
    await expect(page.locator("#primary-navigation")).toBeVisible();
    await expect(page.locator(".language-switcher")).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/js-enabled/);
    await assertNoHorizontalOverflow(page);
    await context.close();
  });
}

test("reduced motion removes transitions and keeps the journey usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  const motion = await page.locator(".project-card").first().evaluate((element) => {
    const style = getComputedStyle(element);
    const toSeconds = (value) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
    return { transition: toSeconds(style.transitionDuration), animation: toSeconds(style.animationDuration) };
  });
  expect(motion.transition).toBeLessThan(0.01);
  expect(motion.animation).toBeLessThan(0.01);
  await assertNoHorizontalOverflow(page);
});
