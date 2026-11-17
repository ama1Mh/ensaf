// axe-core accessibility checks (WCAG 2.0/2.1/2.2 A + AA) on every screen and
// dialog, in all three themes. Serious and critical violations fail the test.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { setup, openApp, enterAsGuestMouse } = require('./helpers');

async function axe(page, label) {
  // Let transitions finish so colours are final.
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('#cursor')
    .analyze();
  const bad = results.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  const summary = bad.map(v => `${label}: [${v.impact}] ${v.id} — ${v.help}\n   ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join('\n   ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
  return results;
}

for (const theme of ['light', 'dark', 'contrast']) {
  test.describe(`theme ${theme}`, () => {
    test('welcome, login, register, permission', async ({ page }) => {
      await setup(page, { settings: { theme } });
      await openApp(page);
      await axe(page, 'welcome');
      await page.click('.lnd-hero-ctas .lnd-btn-primary');
      await axe(page, 'login');
      await page.click('#login-submit');               // with error messages shown
      await axe(page, 'login-errors');
      await page.click('#auth-tab-register');
      await axe(page, 'register');
      await page.click('#auth-guest-btn');
      await axe(page, 'permission');
    });

    test('subjects, lesson, question (with feedback + hint), result', async ({ page }) => {
      test.setTimeout(120_000);
      await setup(page, { settings: { theme } });
      await enterAsGuestMouse(page);
      await axe(page, 'subjects');
      await page.click('.scard[data-id="lit"]');
  await expect(page.locator('#sl')).toBeVisible();
      await axe(page, 'lesson');
      while (await page.locator('.lbtn[data-a="next"]').count()) await page.click('.lbtn[data-a="next"]');
      await page.click('.lbtn[data-a="quiz"]');
      await axe(page, 'question');
      await expect(page.locator('#hint')).toHaveClass(/on/, { timeout: 9000 });
      await axe(page, 'question-hint');
      await page.locator('.abtn').first().click();
      await axe(page, 'question-feedback');
      for (let i = 0; i < 4; i++) {
        await expect(page.locator('.abtn:not([aria-disabled])')).toHaveCount(4, { timeout: 10000 });
        await page.locator('.abtn').first().click();
      }
      await expect(page.locator('#sr')).toBeVisible({ timeout: 15000 });
      await axe(page, 'result');
    });

    test('settings and SOS dialogs, profile', async ({ page }) => {
      await setup(page, { settings: { theme } });
      await openApp(page, '#/login');
      await page.fill('#login-email', 'student@example.com');
      await page.fill('#login-password', 'correct-pass');
      await page.click('#login-submit');
      await expect(page).toHaveURL(/#\/permission/);
      await page.click('#settings-btn');
      await axe(page, 'settings');
      await page.click('#settings-done');
      await page.click('.mbtn[data-mode="mouse"]');
      await page.click('#sos');
      await axe(page, 'sos');
      await page.click('#sos-continue');
      await page.click('#profile-btn');
      await axe(page, 'profile');
    });
  });
}

test('accuracy test page', async ({ page }) => {
  await setup(page);
  await page.goto('/screens/accuracy-test.html');
  await axe(page, 'accuracy-test');
});

test('English (LTR) and Chinese screens', async ({ page }) => {
  for (const lang of ['en', 'zh']) {
    await setup(page, { settings: { lang } });
    await enterAsGuestMouse(page);
    await axe(page, `subjects-${lang}`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  }
});
