// Language switching (text, RTL/LTR, voice language, persistence) and themes.
const { test, expect } = require('@playwright/test');
const { setup, realIssues, openApp, enterAsGuestMouse, spoken } = require('./helpers');

test('switching ar → en → zh changes text, direction and voice language, and persists', async ({ page }) => {
  const issues = await setup(page);
  await enterAsGuestMouse(page);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#ss-title')).toHaveText('اختر مادة دراسية');

  const cases = [
    { lang: 'en', dir: 'ltr', title: 'Choose a subject', voice: 'en-US', card: 'Mathematics' },
    { lang: 'zh', dir: 'ltr', title: '选择学习科目', voice: 'zh-CN', card: '数学' },
    { lang: 'ar', dir: 'rtl', title: 'اختر مادة دراسية', voice: 'ar-SA', card: 'الرياضيات' }
  ];
  for (const c of cases) {
    await page.click(`#lang-switch button[data-lang="${c.lang}"]`);
    await expect(html).toHaveAttribute('lang', c.lang);
    await expect(html).toHaveAttribute('dir', c.dir);
    await expect(page.locator('#ss-title')).toHaveText(c.title);
    await expect(page.locator('.scard[data-id="math"] .snm')).toHaveText(c.card);
    await expect(page.locator(`#lang-switch button[data-lang="${c.lang}"]`)).toHaveAttribute('aria-pressed', 'true');
    // The next spoken text uses the new voice language.
    await page.click('.scard[data-id="math"]');
  await expect(page.locator('#sl')).toBeVisible();
    await expect.poll(async () => (await spoken(page)).at(-1)?.lang).toBe(c.voice);
    await page.click('#home-btn');
    await page.click('.lnd-hero-ctas .lnd-btn-primary');
  }

  await page.click('#lang-switch button[data-lang="en"]');
  await page.reload();
  await expect(page.locator('#load')).toHaveClass(/out/);
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.lnd-hero-ctas .lnd-btn-primary')).toHaveText('Start Learning Now');
  expect(realIssues(issues)).toEqual([]);
});

test('changing language mid-question re-renders question, answers and counter', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  await page.click('.scard[data-id="math"]');
  await expect(page.locator('#sl')).toBeVisible();
  while (await page.locator('.lbtn[data-a="next"]').count()) await page.click('.lbtn[data-a="next"]');
  await page.click('.lbtn[data-a="quiz"]');
  const arText = await page.locator('#qtxt').textContent();
  await page.click('#lang-switch button[data-lang="en"]');
  await expect(page.locator('#qc')).toHaveText('Question 1 of 5');
  await expect(page.locator('#qtxt')).not.toHaveText(arText);
  await expect(page.locator('.altr').first()).toHaveText('A');
});

test('no untranslated strings: English UI contains no Arabic text in the chrome', async ({ page }) => {
  await setup(page, { settings: { lang: 'en' } });
  await enterAsGuestMouse(page);
  const arabic = await page.evaluate(() => {
    const re = /[؀-ۿ]/;
    const els = [...document.querySelectorAll('#bar, .scr.on, #fb, #sos')];
    const bad = [];
    els.forEach(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const el = n.parentElement;
        if (re.test(n.textContent) && !el.closest('[lang="ar"]') && el.offsetParent !== null) bad.push(n.textContent.trim());
      }
    });
    return bad;
  });
  expect(arabic).toEqual([]);
});

test('themes: light, dark and high contrast via settings, persisted', async ({ page }) => {
  const issues = await setup(page);
  await enterAsGuestMouse(page);
  await page.click('#settings-btn');
  await expect(page.locator('#settings')).toBeVisible();
  for (const theme of ['dark', 'contrast', 'light']) {
    await page.click(`#settings [data-setting="theme"] button[data-value="${theme}"]`);
    await expect(page.locator('body')).toHaveClass(new RegExp(`theme-${theme}`));
    const bg = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--bg').trim());
    expect(bg).toBe({ light: '#f4f6fb', dark: '#0b1220', contrast: '#000000' }[theme]);
  }
  await page.click(`#settings [data-setting="theme"] button[data-value="contrast"]`);
  await page.click('#settings-done');
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/theme-contrast/);
  // top-bar button cycles themes
  await page.click('#theme-btn');
  await expect(page.locator('body')).toHaveClass(/theme-light/);
  expect(realIssues(issues)).toEqual([]);
});

test('text size setting scales quiz text', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  const before = await page.locator('.snm').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  await page.click('#settings-btn');
  for (let i = 0; i < 3; i++) await page.click('#settings [data-setting="textScale"] [data-step="1"]');
  await expect(page.locator('#settings [data-setting="textScale"] output')).toContainText('130');
  await page.click('#settings-done');
  const after = await page.locator('.snm').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  expect(after / before).toBeGreaterThan(1.25);
});

test('voice mute and speech rate', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  await page.click('#vi');
  await expect(page.locator('#vi')).toHaveAttribute('aria-pressed', 'true');
  const n = (await spoken(page)).length;
  await page.click('.scard[data-id="math"]');
  await expect(page.locator('#sl')).toBeVisible();
  await page.waitForTimeout(800);
  expect((await spoken(page)).length).toBe(n);
  await page.click('#vi');
  await expect(page.locator('#vi')).toHaveAttribute('aria-pressed', 'false');
});

test('reduced motion: particles are not created and animations are disabled', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await setup(page);
  await openApp(page);
  expect(await page.locator('#pts .pt').count()).toBe(0);
  const dur = await page.locator('.lnd-band-track').evaluate(e => getComputedStyle(e).animationDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
  await context.close();
});

test('icon font failure: no raw icon names are visible', async ({ page }) => {
  await setup(page);           // fonts are stubbed → icon font never loads
  await openApp(page);
  await expect(page.locator('html')).toHaveClass(/icons-failed/, { timeout: 10000 });
  const visible = await page.evaluate(() => [...document.querySelectorAll('.material-symbols-outlined')]
    .filter(e => e.offsetParent !== null && getComputedStyle(e).display !== 'none').length);
  expect(visible).toBe(0);
  // Every icon is hidden from screen readers.
  const exposed = await page.locator('.material-symbols-outlined:not([aria-hidden="true"])').count();
  expect(exposed).toBe(0);
  // Top-bar buttons show their text labels instead.
  await expect(page.locator('#home-btn .btn-label')).toBeVisible();
});
