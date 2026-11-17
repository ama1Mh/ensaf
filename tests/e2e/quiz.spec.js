// Full hands-free quiz in mouse mode using only dwell (no clicks):
// subject → lesson → quiz with hint after 6 s hesitation → feedback → report; SOS.
const { test, expect } = require('@playwright/test');
const { setup, realIssues, enterAsGuestMouse, dwellOn, spoken } = require('./helpers');

test('complete quiz with dwell selection, hint, feedback and session report', async ({ page }) => {
  test.setTimeout(150_000);
  const issues = await setup(page, { settings: { dwellMs: 1000 } });
  await enterAsGuestMouse(page);

  // Subject card by dwell
  await dwellOn(page, page.locator('.scard[data-id="math"]'));
  await expect(page.locator('#sl')).toBeVisible();

  // Lesson pages by dwell (must move away between selections — re-arm)
  while (await page.locator('.lbtn[data-a="next"]').count()) {
    await dwellOn(page, page.locator('.lbtn[data-a="next"]'));
  }
  await dwellOn(page, page.locator('.lbtn[data-a="quiz"]'));
  await expect(page.locator('#sq')).toBeVisible();
  await expect(page.locator('#qc')).toHaveText('السؤال 1 من 5');

  // Dwell progress is visible on the element and the cursor, and leaving cancels.
  const first = page.locator('.abtn').first();
  await page.waitForTimeout(1000);               // let the post-selection cooldown pass
  const box = await first.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
  await page.waitForTimeout(400);
  await expect(first).toHaveClass(/dwelling/);
  const p = await page.locator('#cursor').evaluate(e => parseFloat(e.style.getPropertyValue('--p')));
  expect(p).toBeGreaterThan(0);
  await page.mouse.move(5, 400, { steps: 3 });   // leave → cancelled
  await page.waitForTimeout(800);
  await expect(page.locator('.abtn.ok, .abtn.no')).toHaveCount(0);

  // Hesitation: no answer for 6 s → hint appears and is spoken
  await expect(page.locator('#hint')).toHaveClass(/on/, { timeout: 9000 });
  await expect(page.locator('#htxt')).not.toHaveText('');
  expect((await spoken(page)).some(s => s.text.startsWith('تلميح'))).toBeTruthy();

  // Answer all 5 questions by dwell; each gives visual + text feedback
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.abtn:not([aria-disabled])')).toHaveCount(4, { timeout: 10000 });
    const target = page.locator('.abtn').nth(i % 4);
    await dwellOn(page, target, 1500);
    await expect(page.locator('.abtn.ok')).toHaveCount(1);
    await expect(page.locator('.abtn.ok .afb')).toContainText('✓');
    const wrong = await page.locator('.abtn.no').count();
    if (wrong) await expect(page.locator('.abtn.no .afb')).toContainText('✗');
    // A second selection on the same question is impossible
    await target.click({ force: true });
    await expect(page.locator('.abtn.ok, .abtn.no')).toHaveCount(wrong ? 2 : 1);
    await page.mouse.move(5, 400);
  }

  // Session report
  await expect(page.locator('#sr')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#rs')).toHaveText(/\d+%/);
  await expect(page.locator('#rst .rstat')).toHaveCount(3);
  await expect(page.locator('#rrep .rrow')).toHaveCount(4);
  await expect(page.locator('#rrep')).toContainText('الماوس');
  const hintsShown = await page.locator('#rst .rstat').nth(2).locator('.rsv').textContent();
  expect(Number(hintsShown)).toBeGreaterThanOrEqual(1);
  expect((await spoken(page)).some(s => s.text.includes('انتهى الاختبار'))).toBeTruthy();

  // Result actions by dwell: retry starts a new quiz
  await dwellOn(page, page.locator('#sr [data-ra="retry"]'));
  await expect(page.locator('#sq')).toBeVisible();
  expect(realIssues(issues)).toEqual([]);
});

test('SOS by dwell opens the help dialog, pauses the hint, and continue closes it', async ({ page }) => {
  const issues = await setup(page, { settings: { dwellMs: 1000 } });
  await enterAsGuestMouse(page);
  await page.click('.scard[data-id="geo"]');
  await expect(page.locator('#sl')).toBeVisible();
  while (await page.locator('.lbtn[data-a="next"]').count()) await page.click('.lbtn[data-a="next"]');
  await page.click('.lbtn[data-a="quiz"]');
  await expect(page.locator('#sos')).toBeVisible();

  await dwellOn(page, page.locator('#sos'), 1500);
  await expect(page.locator('#sosm')).not.toBeVisible();        // SOS needs 3 s, not the 1 s dwell
  await page.waitForTimeout(2000);
  await expect(page.locator('#sosm')).toBeVisible();
  expect((await spoken(page)).some(s => s.text.includes('مساعدة'))).toBeTruthy();

  // While the dialog is open, the hint does not appear and only dialog buttons are dwell-able.
  await page.waitForTimeout(6500);
  await expect(page.locator('#hint')).not.toHaveClass(/on/);
  await dwellOn(page, page.locator('#sos-continue'));
  await expect(page.locator('#sosm')).not.toBeVisible();
  await expect(page.locator('#sq')).toBeVisible();
  expect(realIssues(issues)).toEqual([]);
});

test('SOS "go home" and keyboard Escape both close the dialog', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  await page.click('#sos');
  await expect(page.locator('#sosm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#sosm')).not.toBeVisible();
  await page.click('#sos');
  await page.click('#sos-home');
  await expect(page.locator('#sw')).toBeVisible();
});

test('keyboard: answers with number keys and focus moves to the question', async ({ page }) => {
  await setup(page);
  await enterAsGuestMouse(page);
  await page.click('.scard[data-id="hist"]');
  await expect(page.locator('#sl')).toBeVisible();
  while (await page.locator('.lbtn[data-a="next"]').count()) await page.click('.lbtn[data-a="next"]');
  await page.click('.lbtn[data-a="quiz"]');
  await expect(page.locator('#qtxt')).toBeFocused();
  await page.keyboard.press('2');
  await expect(page.locator('.abtn.ok')).toHaveCount(1);
});

test('dwell time can be changed from the top bar and applies immediately', async ({ page }) => {
  await setup(page, { settings: { dwellMs: 3000 } });
  await enterAsGuestMouse(page);
  await expect(page.locator('#dv')).toHaveText('3.0s');
  await page.click('#dm'); await page.click('#dm'); await page.click('#dm'); await page.click('#dm');
  await expect(page.locator('#dv')).toHaveText('1.0s');
  await expect(page.locator('#dm')).toBeDisabled();   // 1.0 s is the minimum
  await dwellOn(page, page.locator('.scard[data-id="bio"]'), 1500);
  await expect(page.locator('#sl')).toBeVisible();
});
