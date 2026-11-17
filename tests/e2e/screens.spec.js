// Every screen loads with no console errors or warnings, and layout fits
// laptop and tablet sizes (no horizontal scrolling, large targets).
const { test, expect } = require('@playwright/test');
const { setup, realIssues, openApp, enterAsGuestMouse, dwellOn } = require('./helpers');

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => {
    const scr = document.querySelector('.scr.on');
    return { doc: document.documentElement.scrollWidth - innerWidth, scr: scr ? scr.scrollWidth - scr.clientWidth : 0 };
  });
  expect(overflow.doc).toBeLessThanOrEqual(1);
  expect(overflow.scr).toBeLessThanOrEqual(1);
}

/** All visible buttons in the active screen are ≥ 44 px; answers & main CTAs ≥ 64 px. */
async function checkTargets(page, mainSelector) {
  const small = await page.evaluate(() => [...document.querySelectorAll('.scr.on button, .scr.on a[href], #bar button')]
    .filter(el => el.offsetParent !== null)
    .map(el => ({ t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), r: el.getBoundingClientRect() }))
    .filter(x => x.r.width > 0 && (x.r.height < 44 || x.r.width < 44))
    .map(x => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
  expect(small, 'targets smaller than 44px').toEqual([]);
  if (mainSelector) {
    const heights = await page.locator(mainSelector).evaluateAll(els => els.filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect().height));
    expect(heights.length).toBeGreaterThan(0);
    heights.forEach(h => expect(h).toBeGreaterThanOrEqual(64));
  }
}

test('welcome, login, permission, subjects, lesson, question, result load cleanly', async ({ page }) => {
  const issues = await setup(page);
  await openApp(page);
  await expect(page.locator('#sw')).toBeVisible();
  await noHorizontalScroll(page);
  await page.click('.lnd-hero-ctas .lnd-btn-primary');
  await expect(page.locator('#login')).toBeVisible();
  await checkTargets(page, '#login .cta');
  await noHorizontalScroll(page);
  await page.click('#auth-guest-btn');
  await expect(page.locator('#sp')).toBeVisible();
  await checkTargets(page, '#sp .mbtn');
  await page.click('.mbtn[data-mode="mouse"]');
  await expect(page.locator('#ss')).toBeVisible();
  await expect(page.locator('.scard')).toHaveCount(6);
  await checkTargets(page, '.scard');
  await noHorizontalScroll(page);
  await page.click('.scard[data-id="sci"]');
  await expect(page.locator('#sl')).toBeVisible();
  await expect(page.locator('#ltit')).not.toBeEmpty();
  await checkTargets(page, '.lbtn');
  while (await page.locator('.lbtn[data-a="next"]').count()) await page.click('.lbtn[data-a="next"]');
  await page.click('.lbtn[data-a="quiz"]');
  await expect(page.locator('#sq')).toBeVisible();
  await checkTargets(page, '.abtn');
  const fs = await page.locator('.atxt').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  expect(fs).toBeGreaterThanOrEqual(18);
  await noHorizontalScroll(page);
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.abtn:not([aria-disabled])')).toHaveCount(4);
    await page.locator('.abtn').first().click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator('#sr')).toBeVisible({ timeout: 25000 });
  await checkTargets(page, '#sr .racts button');
  expect(realIssues(issues)).toEqual([]);
});

test('profile screen loads for a signed-in user', async ({ page }) => {
  const issues = await setup(page);
  await openApp(page, '#/login');
  await page.fill('#login-email', 'student@example.com');
  await page.fill('#login-password', 'correct-pass');
  await page.click('#login-submit');
  await expect(page).toHaveURL(/#\/permission/);
  await page.click('#profile-btn');
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#profile-email')).toHaveText('student@example.com');
  await checkTargets(page, '#profile-save-btn');
  expect(realIssues(issues)).toEqual([]);
});

test('accuracy test page loads and the simulated run records results', async ({ page }) => {
  const issues = await setup(page);
  await page.goto('/screens/accuracy-test.html');
  await expect(page.locator('.tgt')).toHaveCount(12);
  await page.click('#acc-mode button[data-value="sim"]');
  await page.click('#acc-start');
  await expect(page.locator('#acc-rows tr')).toHaveCount(2);
  await noHorizontalScroll(page);
  expect(realIssues(issues)).toEqual([]);
});

test('accuracy test page: a real mouse-dwell run measures hits', async ({ page }) => {
  await setup(page);
  await page.goto('/screens/accuracy-test.html');
  await page.click('#dwell-m'); await page.click('#dwell-m');     // 1.0 s
  await page.click('#trials-m'); await page.click('#trials-m');   // 4 trials
  await page.click('#acc-start');
  for (let i = 0; i < 4; i++) {
    const active = page.locator('.tgt.active');
    await expect(active).toHaveCount(1);
    await dwellOn(page, active, 1900);
    await page.waitForTimeout(600);
  }
  await expect(page.locator('#acc-rows tr').first()).toContainText('100%');
});

test('routes are guarded: deep link to a quiz without a session goes to login', async ({ page }) => {
  await setup(page);
  await openApp(page, '#/question');
  await expect(page).toHaveURL(/#\/login/);
});

test('unknown hash falls back to the welcome screen', async ({ page }) => {
  await setup(page);
  await openApp(page, '#/does-not-exist');
  await expect(page.locator('#sw')).toBeVisible();
});

test('guest can get back to subjects from the welcome page', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  await page.click('#home-btn');
  await expect(page.locator('#sw')).toBeVisible();
  await page.click('.lnd-hero-ctas .lnd-btn-primary');
  await expect(page).toHaveURL(/#\/subjects/);
});
