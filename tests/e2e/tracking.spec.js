// Head / eye mode robustness with the fake camera: graceful fallback to mouse
// when the camera is denied / missing or MediaPipe cannot load, with spoken +
// visual messages. A full MediaPipe run is optional (needs internet):
//   ENSAF_NETWORK=1 npx playwright test tracking
const { test, expect } = require('@playwright/test');
const { setup, realIssues, openApp, spoken } = require('./helpers');

async function toModeScreen(page) {
  await openApp(page, '#/login');
  await page.click('#auth-guest-btn');
  await expect(page).toHaveURL(/#\/permission/);
}

test('camera denied → mouse mode with a clear spoken and visual message (no alert)', async ({ page }) => {
  const issues = await setup(page, { settings: { mode: 'head' } });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  page.on('dialog', d => { throw new Error('alert() must not be used: ' + d.message()); });
  await toModeScreen(page);
  await page.click('.mbtn[data-mode="head"]');
  await expect(page.locator('#toast')).toHaveClass(/on/);
  await expect(page.locator('#toast-msg')).toContainText('لم يُسمح باستخدام الكاميرا');
  await expect(page).toHaveURL(/#\/subjects/);
  await expect(page.locator('#bst')).toHaveText('وضع الماوس');
  expect((await spoken(page)).some(s => s.text.includes('الكاميرا'))).toBeTruthy();
  expect(realIssues(issues, ['camera error'])).toEqual([]);
});

test('no camera → mouse mode with message', async ({ page }) => {
  await setup(page, { settings: { mode: 'eye', lang: 'en' } });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('none', 'NotFoundError'));
  });
  await toModeScreen(page);
  await page.click('.mbtn[data-mode="eye"]');
  await expect(page.locator('#toast-msg')).toHaveText('No camera was found, so ENSAF switched to mouse mode.');
});

test('MediaPipe CDN blocked → camera released, mouse mode, message', async ({ page }) => {
  await setup(page, { settings: { mode: 'head' } });
  await page.route(/@mediapipe\/face_mesh/, r => r.abort());
  await toModeScreen(page);
  await page.click('.mbtn[data-mode="head"]');
  await expect(page.locator('#toast-msg')).toContainText('تعذّر تحميل نظام التتبع', { timeout: 40000 });
  await expect(page).toHaveURL(/#\/subjects/);
  // The camera stream was stopped (no leak).
  const live = await page.evaluate(() => !!document.getElementById('vcam').srcObject);
  expect(live).toBe(false);
});

test('MediaPipe script is not downloaded in mouse mode', async ({ page }) => {
  const requested = [];
  page.on('request', r => { if (r.url().includes('mediapipe')) requested.push(r.url()); });
  await setup(page);
  await toModeScreen(page);
  await page.click('.mbtn[data-mode="mouse"]');
  await expect(page).toHaveURL(/#\/subjects/);
  expect(requested).toEqual([]);
  // and index.html has no MediaPipe <script> tags at all (duplicates removed)
  expect(await page.locator('script[src*="mediapipe"]').count()).toBe(0);
});

test('real MediaPipe with fake camera: tracker starts, reports no face, can switch to mouse', async ({ page }) => {
  test.skip(!process.env.ENSAF_NETWORK, 'needs internet (set ENSAF_NETWORK=1)');
  test.setTimeout(120_000);
  await setup(page, { settings: { mode: 'head' } });
  await toModeScreen(page);
  await page.click('.mbtn[data-mode="head"]');
  await expect(page).toHaveURL(/#\/subjects/, { timeout: 60000 });
  await expect(page.locator('#vcam')).toHaveClass(/show/);
  await expect(page.locator('#recal-btn')).toBeVisible();
  // The fake camera shows no face → face-lost message with a "switch to mouse" action.
  await expect(page.locator('#toast-msg')).toContainText('لا أرى وجهك', { timeout: 20000 });
  await page.locator('#toast-actions button').first().click();
  await expect(page.locator('#bst')).toHaveText('وضع الماوس');
  expect(await page.evaluate(() => !!document.getElementById('vcam').srcObject)).toBe(false);
});
