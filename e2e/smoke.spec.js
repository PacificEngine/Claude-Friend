import { test, expect } from '@playwright/test';

test('egg hatches, can be fed, and survives a reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?speed=600'); // one game minute per 100 ms
  const lcd = page.locator('#lcd');

  await expect(lcd).toHaveAttribute('data-stage', 'egg');
  await expect(lcd).toHaveAttribute('data-stage', 'baby', { timeout: 5000 });
  await expect(lcd).toHaveAttribute('aria-label', /Baby/i);

  await expect(lcd).toHaveAttribute('data-hunger', '3', { timeout: 10000 });
  await page.click('[data-button="B"]'); // open feed menu (feed is the first icon)
  await page.click('[data-button="B"]'); // choose meal
  await expect(lcd).toHaveAttribute('data-hunger', '4');

  // Reload at real speed (the default): a lost save would give a fresh egg, not a fed baby.
  await page.goto('/?speed=1');
  await expect(lcd).toHaveAttribute('data-stage', 'baby');
  await expect(lcd).toHaveAttribute('data-hunger', '4');

  // A button that does nothing must still say why.
  await page.click('[data-button="A"]'); // light
  await page.click('[data-button="B"]');
  await expect(page.locator('#notice')).toHaveText("It's daytime");

  expect(errors).toEqual([]);
});

test('menu icons are buttons that select but do not run', async ({ page }) => {
  await page.goto('/?speed=60');
  const lcd = page.locator('#lcd');
  const status = page.locator('button[data-menu="status"]');

  await status.click();
  await expect(lcd).toHaveAttribute('data-screen', 'main');
  await expect(status).toHaveAttribute('aria-current', 'true');

  await page.click('[data-button="B"]');
  await expect(lcd).toHaveAttribute('data-screen', 'status');

  await page.click('[data-button="C"]');
  await expect(lcd).toHaveAttribute('data-screen', 'main');
});

test('music toggle works independently of sound and persists across a reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?speed=600');
  const music = page.locator('#music');
  const sound = page.locator('#mute');

  await expect(music).toHaveText('Music: on');
  await expect(music).toHaveAttribute('aria-pressed', 'false');

  await music.click();
  await expect(music).toHaveText('Music: off');
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await expect(sound).toHaveText('Sound: on');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('virtual-pet-prefs')));
  expect(stored).toEqual({ sound: true, music: false });

  await page.reload();
  await expect(music).toHaveText('Music: off');
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await expect(sound).toHaveText('Sound: on');

  await sound.click();
  await music.click();
  await page.reload();
  await expect(sound).toHaveText('Sound: off');
  await expect(music).toHaveText('Music: on');
  await expect(music).toHaveAttribute('aria-pressed', 'false');

  expect(errors).toEqual([]);
});
