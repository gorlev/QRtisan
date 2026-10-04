/** Desktop preview: sticky with expanded, independently scrollable warnings. */
import { expect, test } from '@playwright/test';
import { seedUrl } from './seed';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 600 }]) {
  for (const locale of ['tr', 'en'] as const) {
    test(`desktop warnings are readable without expansion ${viewport.width}×${viewport.height} ${locale}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.getByTestId(`locale-${locale}`).click();
      await seedUrl(page);
      await page.locator('#tab-frame').click();
      await page.locator('label:has(input[name="frame-style"][value="labelBottom"])').click();
      await page.locator('#frame-caption').fill('Contact — scan and follow along');
      await page.locator('#quiet-zone').focus();
      await page.keyboard.press('Home');
      await page.locator('#tab-color').click();
      await page.locator('#color-fg').fill('#8A8A8A');
      await page.locator('#transparent-bg').click();
      const scanability = page.getByTestId('preview-scanability');
      await expect(scanability.locator('li')).toHaveCount(3);
      await expect(page.getByRole('button', { name: /^(Ayrıntılar|Details)$/ })).toHaveCount(0);
      for (const item of await scanability.locator('li').all()) {
        await item.scrollIntoViewIfNeeded();
        await expect(item).toBeInViewport();
        await expect(item.locator('p').nth(1)).not.toBeEmpty();
      }
      const rail = page.getByTestId('preview-rail');
      expect(await rail.evaluate(el => getComputedStyle(el).position)).toBe('sticky');
      await page.getByTestId('design-column').evaluate(el => {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 100, behavior: 'instant' });
      });
      await expect.poll(async () => {
        const railBox = await rail.boundingBox();
        const headerBox = await page.getByTestId('topbar').boundingBox();
        return Math.abs(railBox!.y - (headerBox!.y + headerBox!.height + 12));
      }).toBeLessThan(2);
      const canvas = page.getByTestId('preview-rail').locator('canvas');
      await canvas.scrollIntoViewIfNeeded();
      await expect(canvas).toBeInViewport();
      const size = await canvas.boundingBox();
      expect(size!.height).toBeGreaterThan(180);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const downloadButton = page.getByRole('button', { name: /PNG indir|Download PNG/ });
      await downloadButton.scrollIntoViewIfNeeded();
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      expect((await downloadPromise).suggestedFilename()).toMatch(/\.png$/);
    });
  }
}

test('clear desktop preview retains its sticky rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await seedUrl(page);
  const rail = page.getByTestId('preview-rail');
  await expect(rail.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('preview-scanability').locator('li')).toHaveCount(0);
  expect(await rail.evaluate(el => getComputedStyle(el).position)).toBe('sticky');
});
