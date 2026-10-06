import { test, expect } from '@playwright/test';

test('egg hatches, can be fed, and survives a reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?speed=600'); // one game minute per 100 ms
  const lcd = page.locator('#lcd');

  await expect(lcd).toHaveAttribute('data-stage', 'egg');
  await expect(lcd).toHaveAttribute('data-stage', 'baby', { timeout: 5000 });

  await expect(lcd).toHaveAttribute('data-hunger', '3', { timeout: 10000 });
  await page.click('[data-button="B"]'); // open feed menu (feed is the first icon)
  await page.click('[data-button="B"]'); // choose meal
  await expect(lcd).toHaveAttribute('data-hunger', '4');

  // Reload at real speed: a lost save would give a fresh egg, not a fed baby.
  await page.goto('/');
  await expect(lcd).toHaveAttribute('data-stage', 'baby');
  await expect(lcd).toHaveAttribute('data-hunger', '4');

  expect(errors).toEqual([]);
});
