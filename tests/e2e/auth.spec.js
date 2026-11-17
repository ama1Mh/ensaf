// Login, registration, guest mode, error messages in three languages,
// loading state / double submit, show-hide password, offline and blocked Firebase.
const { test, expect } = require('@playwright/test');
const { setup, realIssues, openApp } = require('./helpers');

test.describe('login & registration (mock Firebase)', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await openApp(page, '#/login');
  });

  test('empty fields show per-field errors', async ({ page }) => {
    await page.click('#login-submit');
    await expect(page.locator('#login-email-err')).toHaveText('اكتب بريدك الإلكتروني.');
    await expect(page.locator('#login-password-err')).toBeVisible();
    await expect(page.locator('#login-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#login-email')).toBeFocused();
  });

  test('invalid email format', async ({ page }) => {
    await page.fill('#login-email', 'not-an-email');
    await page.fill('#login-password', 'x');
    await page.click('#login-submit');
    await expect(page.locator('#login-email-err')).toContainText('name@example.com');
  });

  test('wrong password shows a friendly message in ar, en and zh', async ({ page }) => {
    const expected = { ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', en: 'The email or password is incorrect.', zh: '邮箱或密码不正确。' };
    for (const lang of ['ar', 'en', 'zh']) {
      await page.click(`#lang-switch button[data-lang="${lang}"]`);
      await page.fill('#login-email', 'student@example.com');
      await page.fill('#login-password', 'wrong-pass');
      await page.click('#login-submit');
      await expect(page.locator('#auth-status')).toHaveText(expected[lang]);
      await expect(page.locator('#auth-status')).toHaveClass(/error/);
    }
  });

  test('network, disabled and rate-limit errors are translated', async ({ page }) => {
    await page.click('#lang-switch button[data-lang="en"]');
    const cases = {
      'network@example.com': "Can't reach the server",
      'disabled@example.com': 'This account has been disabled',
      'many@example.com': 'Too many attempts'
    };
    for (const [email, text] of Object.entries(cases)) {
      await page.fill('#login-email', email);
      await page.fill('#login-password', 'whatever');
      await page.click('#login-submit');
      await expect(page.locator('#auth-status')).toContainText(text);
    }
  });

  test('loading state and no double submit', async ({ page }) => {
    await page.fill('#login-email', 'student@example.com');
    await page.fill('#login-password', 'wrong-pass');
    await page.click('#login-submit');
    await expect(page.locator('#login-submit')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#login-submit')).toBeDisabled();
    await page.locator('#auth-login-form').evaluate(f => f.requestSubmit());   // second submit while busy
    await expect(page.locator('#auth-status')).toHaveClass(/error/);
    expect(await page.evaluate(() => window.__fbCalls.signIn)).toBe(1);
    await expect(page.locator('#login-submit')).toBeEnabled();
  });

  test('show / hide password toggle', async ({ page }) => {
    const toggle = page.locator('#auth-login-form .pw-toggle');
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toContainText('إخفاء كلمة المرور');
    await toggle.click();
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
  });

  test('successful login goes to the mode selection screen', async ({ page }) => {
    await page.fill('#login-email', 'student@example.com');
    await page.fill('#login-password', 'correct-pass');
    await page.click('#login-submit');
    await expect(page.locator('#auth-status')).toHaveClass(/success/);
    await expect(page).toHaveURL(/#\/permission/);
    await expect(page.locator('#profile-btn')).toBeVisible();
  });

  test('registration: validation, email in use, weak password, mismatch, success', async ({ page }) => {
    await page.click('#auth-tab-register');
    await expect(page.locator('#auth-tab-register')).toHaveAttribute('aria-selected', 'true');
    await page.click('#register-submit');
    await expect(page.locator('#register-name-err')).toBeVisible();

    await page.fill('#register-name', 'Sara');
    await page.fill('#register-email', 'new@example.com');
    await page.fill('#register-password', '123');
    await page.fill('#register-confirm', '123');
    await page.click('#register-submit');
    await expect(page.locator('#register-password-err')).toContainText('6');

    await page.fill('#register-password', '123456');
    await page.fill('#register-confirm', '654321');
    await page.click('#register-submit');
    await expect(page.locator('#register-confirm-err')).toBeVisible();

    await page.fill('#register-email', 'taken@example.com');
    await page.fill('#register-confirm', '123456');
    await page.click('#register-submit');
    await expect(page.locator('#auth-status')).toContainText('لديه حساب');
    await expect(page.locator('#register-email')).toHaveAttribute('aria-invalid', 'true');

    await page.fill('#register-email', 'new@example.com');
    await page.click('#register-submit');
    await expect(page.locator('#auth-status')).toHaveClass(/success/);
    await expect(page).toHaveURL(/#\/permission/);
  });

  test('password reset requires an email and confirms', async ({ page }) => {
    await page.click('#auth-forgot-btn');
    await expect(page.locator('#login-email-err')).toBeVisible();
    await page.fill('#login-email', 'student@example.com');
    await page.click('#auth-forgot-btn');
    await expect(page.locator('#auth-status')).toHaveClass(/success/);
  });

  test('tabs are keyboard operable', async ({ page }) => {
    await page.focus('#auth-tab-login');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#auth-tab-register')).toBeFocused();
    await expect(page.locator('#auth-register-form')).toBeVisible();
  });

  test('sign out returns to login', async ({ page }) => {
    await page.fill('#login-email', 'student@example.com');
    await page.fill('#login-password', 'correct-pass');
    await page.click('#login-submit');
    await expect(page).toHaveURL(/#\/permission/);
    await page.click('#logout-btn');
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.locator('#profile-btn')).toBeHidden();
  });
});

test('guest flow works and the guest button is first on the login screen', async ({ page }) => {
  const issues = await setup(page);
  await openApp(page, '#/login');
  const guestBox = await page.locator('#auth-guest-btn').boundingBox();
  const loginBox = await page.locator('#login-email').boundingBox();
  expect(guestBox.y).toBeLessThan(loginBox.y);
  await page.click('#auth-guest-btn');
  await expect(page).toHaveURL(/#\/permission/);
  await expect(page.locator('#profile-btn')).toBeHidden();
  expect(realIssues(issues)).toEqual([]);
});

test('Firebase blocked: login explains it and guest mode still works', async ({ page }) => {
  const issues = await setup(page, { firebase: 'blocked' });
  await openApp(page, '#/login');
  await expect(page.locator('#auth-status')).toContainText('غير متاحة', { timeout: 15000 });
  await page.fill('#login-email', 'student@example.com');
  await page.fill('#login-password', 'correct-pass');
  await page.click('#login-submit');
  await expect(page.locator('#auth-status')).toHaveClass(/error/, { timeout: 15000 });
  await page.click('#auth-guest-btn');
  await expect(page).toHaveURL(/#\/permission/);
  // Only the blocked network requests themselves may be logged.
  expect(realIssues(issues, ['Failed to load', 'gstatic', 'firebase'])).toEqual([]);
});

test('offline: submitting shows the offline message', async ({ page, context }) => {
  await setup(page);
  await openApp(page, '#/login');
  await context.setOffline(true);
  await page.fill('#login-email', 'student@example.com');
  await page.fill('#login-password', 'correct-pass');
  await page.click('#login-submit');
  await expect(page.locator('#auth-status')).toContainText('غير متصل');
  await context.setOffline(false);
});
