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

test('Play opens a chooser for two mini-games; C cancels back to main', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?speed=600'); // an egg refuses to play, so hatch it first
  const lcd = page.locator('#lcd');
  await expect(lcd).toHaveAttribute('data-stage', 'baby', { timeout: 5000 });
  await page.goto('/?speed=1'); // then stop the clock from interfering

  await page.click('button[data-menu="play"]');
  await page.click('[data-button="B"]');
  await expect(lcd).toHaveAttribute('data-screen', 'play');
  await expect(lcd).toHaveAttribute('aria-label', /Play menu: Left or Right selected/);

  await page.click('[data-button="C"]');
  await expect(lcd).toHaveAttribute('data-screen', 'main');

  await page.click('[data-button="B"]');
  await page.click('[data-button="A"]'); // toggle to Higher or Lower
  await expect(lcd).toHaveAttribute('aria-label', /Higher or Lower selected/);
  await page.click('[data-button="B"]');
  await expect(lcd).toHaveAttribute('data-screen', 'highlow');
  await expect(lcd).toHaveAttribute('aria-label', /Higher or lower: number [1-9], round 1 of 3/);

  await page.click('[data-button="C"]');
  await expect(lcd).toHaveAttribute('data-screen', 'main');

  expect(errors).toEqual([]);
});

test('New egg asks first, then starts over; Cancel changes nothing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?speed=60'); // the egg hatches in about 5 s
  const lcd = page.locator('#lcd');
  const dialog = page.locator('#new-egg-dialog');
  await expect(lcd).toHaveAttribute('data-stage', 'baby', { timeout: 15000 });

  await page.click('#new-egg');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Start over with a new egg? Your current pet will be lost.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(lcd).toHaveAttribute('data-stage', 'baby');

  await page.click('#new-egg');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(lcd).toHaveAttribute('data-stage', 'baby');

  await page.click('#new-egg');
  await dialog.getByRole('button', { name: 'Start over' }).click();
  await expect(lcd).toHaveAttribute('data-stage', 'egg');
  await expect(page.locator('#notice')).toHaveText('A new egg!');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('virtual-pet')));
  expect(saved.state.stage).toBe('egg');
  expect(saved.state.ageMinutes).toBeLessThan(2);

  // The sound and music toggles are untouched by all of this.
  await expect(page.locator('#mute')).toHaveText('Sound: on');
  await expect(page.locator('#music')).toHaveText('Music: on');

  expect(errors).toEqual([]);
});
