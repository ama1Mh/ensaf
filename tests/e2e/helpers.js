/**
 * Shared Playwright helpers.
 *  - Firebase is replaced by an in-page mock (no real accounts are touched).
 *  - Google Fonts / Unsplash are stubbed so tests are deterministic offline.
 *  - speechSynthesis.speak is spied: window.__spoken = [{ text, lang }].
 *  - Console errors / warnings are collected so tests can assert there are none.
 */
const { expect } = require('@playwright/test');

const MOCK_FIREBASE = `
(function () {
  const users = { 'student@example.com': { password: 'correct-pass', uid: 'u1', displayName: 'Student' } };
  const profiles = {};
  let current = null;
  const listeners = [];
  window.__fbCalls = { signIn: 0, signUp: 0, reset: 0, saveProfile: 0 };
  const err = code => ({ success: false, code, message: code });
  const notify = () => listeners.forEach(cb => cb(current));
  const delay = ms => new Promise(r => setTimeout(r, ms));
  window.FirebaseAuthApi = {
    async signIn(email, password) {
      window.__fbCalls.signIn++;
      await delay(300);
      if (email === 'network@example.com') return err('auth/network-request-failed');
      if (email === 'disabled@example.com') return err('auth/user-disabled');
      if (email === 'many@example.com') return err('auth/too-many-requests');
      const u = users[email];
      if (!u || u.password !== password) return err('auth/invalid-credential');
      current = { uid: u.uid, email, displayName: u.displayName };
      setTimeout(notify, 0);
      return { success: true, user: current };
    },
    async signUp(name, email, password) {
      window.__fbCalls.signUp++;
      await delay(300);
      if (email === 'taken@example.com' || users[email]) return err('auth/email-already-in-use');
      users[email] = { password, uid: 'u' + Date.now(), displayName: name };
      current = { uid: users[email].uid, email, displayName: name };
      setTimeout(notify, 0);
      return { success: true, user: current };
    },
    async sendPasswordReset() { window.__fbCalls.reset++; await delay(100); return { success: true }; },
    async signOut() { current = null; setTimeout(notify, 0); return { success: true }; },
    onAuthStateChanged(cb) { listeners.push(cb); setTimeout(() => cb(current), 0); return () => {}; },
    currentUser() { return current; },
    async getUserProfile(uid) { return profiles[uid] || null; },
    async saveUserProfile(uid, data) { window.__fbCalls.saveProfile++; profiles[uid] = { ...(profiles[uid] || {}), ...data }; return { success: true }; },
    async saveQuizResult() { return { success: true }; },
    async getQuizResults() { return []; }
  };
  window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ok: true } }));
})();
`;

const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/**
 * Prepare a page: routes, spies, console collection, initial settings.
 * @param {import('@playwright/test').Page} page
 * @param {object} o
 * @param {object} [o.settings]  saved settings (default: mouse mode, 1 s dwell)
 * @param {'mock'|'blocked'} [o.firebase]
 */
async function setup(page, { settings = {}, firebase = 'mock', fonts = 'stub' } = {}) {
  const issues = [];
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', e => issues.push(`pageerror: ${e.message}`));

  if (firebase === 'mock') {
    await page.route('**/js/shared/firebase-init.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK_FIREBASE }));
  } else if (firebase === 'blocked') {
    // Simulates a school network that blocks Google: the module's imports fail.
    await page.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 503, contentType: 'text/javascript', body: '' }));
  }
  if (fonts === 'stub') {
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '/* stub */' }));
  }
  await page.route('https://images.unsplash.com/**', r => r.fulfill({ contentType: 'image/png', body: TINY_PNG }));

  const s = { mode: 'mouse', dwellMs: 1000, sounds: false, ...settings };
  await page.addInitScript(saved => {
    if (!sessionStorage.getItem('__seeded')) {
      localStorage.setItem('ensaf-settings', JSON.stringify(saved));
      sessionStorage.setItem('__seeded', '1');
    }
    window.__spoken = [];
    if (window.speechSynthesis) {
      const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = u => { window.__spoken.push({ text: u.text, lang: u.lang }); try { orig(u); } catch (e) {} };
    }
  }, s);
  return issues;
}

/** Filter out console messages that are expected / outside our control. */
function realIssues(issues, allow = []) {
  return issues.filter(i => !allow.some(a => i.includes(a)));
}

async function openApp(page, hash = '') {
  await page.goto('/index.html' + hash);
  await expect(page.locator('#load')).toHaveClass(/out/, { timeout: 15000 });
  // Wait for the first screen transition (it moves focus to the screen heading).
  await page.waitForFunction(() => typeof ROUTER !== 'undefined' && ROUTER.currentScreen && !ROUTER.transitioning);
  await page.waitForTimeout(60);
}

async function enterAsGuestMouse(page) {
  await openApp(page);
  await page.click('.lnd-hero-ctas .lnd-btn-primary');
  await expect(page).toHaveURL(/#\/login/);
  await page.click('#auth-guest-btn');
  await expect(page).toHaveURL(/#\/permission/);
  await page.click('.mbtn[data-mode="mouse"]');
  await expect(page).toHaveURL(/#\/subjects/);
}

/** Rest the mouse on an element (dwell). Moves in two steps so the controller sees it. */
async function dwellOn(page, locator, ms = 1600) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element not visible for dwell');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x - 60, y - 60);
  await page.waitForTimeout(80);
  await page.mouse.move(x, y, { steps: 4 });
  await page.waitForTimeout(ms);
}

async function spoken(page) { return page.evaluate(() => window.__spoken.slice()); }

module.exports = { setup, realIssues, openApp, enterAsGuestMouse, dwellOn, spoken };
