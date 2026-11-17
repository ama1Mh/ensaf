const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { TRANSLATIONS } = require('../../js/i18n/translations.js');
const { translate, normalizeLang, dirFor, speechLangFor } = require('../../js/core/i18n.js');

const ROOT = path.join(__dirname, '..', '..');

test('every key exists in ar, en and zh and is non-empty', () => {
  const langs = ['ar', 'en', 'zh'];
  const all = new Set(langs.flatMap(l => Object.keys(TRANSLATIONS[l])));
  for (const l of langs) {
    for (const k of all) {
      assert.ok(typeof TRANSLATIONS[l][k] === 'string' && TRANSLATIONS[l][k].trim(), `${l}.${k} missing or empty`);
    }
  }
});

test('placeholders match across languages', () => {
  const ph = s => (s.match(/\{[a-z]+\}/gi) || []).sort().join(',');
  for (const k of Object.keys(TRANSLATIONS.ar)) {
    assert.equal(ph(TRANSLATIONS.en[k]), ph(TRANSLATIONS.ar[k]), `en.${k} placeholders`);
    assert.equal(ph(TRANSLATIONS.zh[k]), ph(TRANSLATIONS.ar[k]), `zh.${k} placeholders`);
  }
});

test('lookup with variables', () => {
  assert.equal(translate(TRANSLATIONS, 'en', 'questionCounter', { current: 2, total: 5 }), 'Question 2 of 5');
  assert.equal(translate(TRANSLATIONS, 'ar', 'questionCounter', { current: 2, total: 5 }), 'السؤال 2 من 5');
});

test('fallbacks: unknown language → Arabic, unknown key → key', () => {
  assert.equal(translate(TRANSLATIONS, 'fr', 'home'), TRANSLATIONS.ar.home);
  assert.equal(translate(TRANSLATIONS, 'en', 'no_such_key'), 'no_such_key');
  assert.equal(translate({ ar: {}, en: { only: 'x' } }, 'zh', 'only'), 'x');
});

test('language helpers', () => {
  assert.equal(normalizeLang('en-GB'), 'en');
  assert.equal(normalizeLang('ZH'), 'zh');
  assert.equal(normalizeLang(undefined), 'ar');
  assert.equal(dirFor('ar'), 'rtl');
  assert.equal(dirFor('en'), 'ltr');
  assert.equal(dirFor('zh'), 'ltr');
  assert.equal(speechLangFor('ar'), 'ar-SA');
  assert.equal(speechLangFor('en'), 'en-US');
  assert.equal(speechLangFor('zh'), 'zh-CN');
});

test('every data-i18n key used in HTML exists', () => {
  const files = ['index.html', ...fs.readdirSync(path.join(ROOT, 'screens')).map(f => path.join('screens', f))];
  const re = /data-i18n(?:-placeholder|-aria-label|-title|-alt)?="([^"]+)"/g;
  for (const f of files) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let m;
    while ((m = re.exec(html))) assert.ok(TRANSLATIONS.ar[m[1]] !== undefined, `${f}: unknown key ${m[1]}`);
  }
});

test('every t(\'key\') used in the app exists', () => {
  for (const f of ['js/app.js', 'screens/accuracy-test.html']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const re = /\bt\('([A-Za-z0-9]+)'/g;
    let m;
    while ((m = re.exec(src))) assert.ok(TRANSLATIONS.ar[m[1]] !== undefined, `${f}: unknown key ${m[1]}`);
  }
});
