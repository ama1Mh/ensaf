const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSettings, steadinessToCutoff, DEFAULTS } = require('../../js/core/settings.js');
const { pickVoice } = require('../../js/features/voice.js');

test('settings: defaults for empty / garbage input', () => {
  assert.deepEqual(sanitizeSettings(null), { ...DEFAULTS, calibration: {} });
  const s = sanitizeSettings({ mode: 'feet', theme: 42, lang: 'fr', dwellMs: 'abc' });
  assert.equal(s.mode, 'head');
  assert.equal(s.theme, 'light');
  assert.equal(s.lang, 'ar');
  assert.equal(s.dwellMs, 3500);
});

test('settings: clamp and snap numbers', () => {
  const s = sanitizeSettings({ dwellMs: 99999, sensitivity: 0.1, textScale: 1.33, speechRate: 1.04 });
  assert.equal(s.dwellMs, 8000);
  assert.equal(s.sensitivity, 0.5);
  assert.equal(s.textScale, 1.3);
  assert.equal(s.speechRate, 1.0);
});

test('settings: legacy theme names and language key are migrated', () => {
  assert.equal(sanitizeSettings({ theme: 'warm' }).theme, 'dark');
  assert.equal(sanitizeSettings({ theme: 'default' }).theme, 'light');
  assert.equal(sanitizeSettings({ language: 'zh' }).lang, 'zh');
  assert.equal(sanitizeSettings({ voice: 'false' }).voice, false);
});

test('settings: calibration validated', () => {
  const s = sanitizeSettings({ calibration: { head: { cx: 0, cy: 0, sx: 3, sy: 2 }, eye: { cx: 'x' } } });
  assert.deepEqual(s.calibration, { head: { cx: 0, cy: 0, sx: 3, sy: 2 } });
});

test('steadiness maps to a lower cut-off when steadier', () => {
  assert.ok(steadinessToCutoff(1) < steadinessToCutoff(0));
  assert.equal(steadinessToCutoff(0), 1);
});

test('pickVoice: exact locale beats language-only; natural voices preferred; none → null', () => {
  const voices = [
    { name: 'Generic Arabic', lang: 'ar-EG' },
    { name: 'Microsoft Hamed', lang: 'ar-SA', localService: true },
    { name: 'Microsoft Zariyah Online (Natural)', lang: 'ar-SA' },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Microsoft Huihui', lang: 'zh-CN' }
  ];
  assert.equal(pickVoice(voices, 'ar-SA').name, 'Microsoft Zariyah Online (Natural)');
  assert.equal(pickVoice(voices, 'en-GB').name, 'Google US English');
  assert.equal(pickVoice(voices, 'zh-CN').name, 'Microsoft Huihui');
  assert.equal(pickVoice(voices, 'fr-FR'), null);
  assert.equal(pickVoice([], 'ar-SA'), null);
  assert.equal(pickVoice([{ name: 'x', lang: 'ar_SA' }], 'ar-SA').name, 'x');
});
