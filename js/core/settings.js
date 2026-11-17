/**
 * Settings — one validated object for every user preference.
 * Stored in localStorage ("ensaf-settings"); for signed-in users the same
 * object is also saved as `preferences` in their Firestore profile.
 *
 * sanitizeSettings() is pure and unit-tested: anything invalid falls back to
 * the default, numbers are clamped and snapped to their step.
 */
(function (root) {
  'use strict';

  const RANGES = {
    dwellMs:     { min: 1000, max: 8000, step: 500,  def: 3500 },
    sensitivity: { min: 0.5,  max: 2.0,  step: 0.25, def: 1.0 },  // × default cursor gain
    steadiness:  { min: 0,    max: 1,    step: 0.25, def: 0.5 },  // maps to One Euro minCutoff
    textScale:   { min: 0.9,  max: 1.6,  step: 0.1,  def: 1.0 },
    speechRate:  { min: 0.6,  max: 1.4,  step: 0.1,  def: 0.9 }
  };
  const ENUMS = {
    mode:  ['head', 'eye', 'mouse'],
    theme: ['light', 'dark', 'contrast'],
    lang:  ['ar', 'en', 'zh']
  };
  const BOOLS = { mouseDwell: true, voice: true, sounds: true };

  const DEFAULTS = Object.freeze({
    mode: 'head', theme: 'light', lang: 'ar',
    dwellMs: 3500, sensitivity: 1.0, steadiness: 0.5, textScale: 1.0, speechRate: 0.9,
    mouseDwell: true, voice: true, sounds: true,
    calibration: {}   // { head: {...}, eye: {...} }
  });

  const LEGACY_THEME = { default: 'light', warm: 'dark', light: 'light', dark: 'dark', contrast: 'contrast' };

  function snap(value, { min, max, step, def }) {
    const n = Number(value);
    if (!Number.isFinite(n)) return def;
    const clamped = Math.min(max, Math.max(min, n));
    const snapped = Math.round((clamped - min) / step) * step + min;
    return Math.round(snapped * 1000) / 1000;
  }

  function sanitizeSettings(input) {
    const src = (input && typeof input === 'object') ? input : {};
    const out = { ...DEFAULTS, calibration: {} };
    // Accept old preference names (theme 'default'/'warm', language).
    const theme = LEGACY_THEME[src.theme];
    if (theme) out.theme = theme;
    const lang = src.lang || src.language;
    if (ENUMS.lang.includes(lang)) out.lang = lang;
    if (ENUMS.mode.includes(src.mode)) out.mode = src.mode;
    Object.keys(RANGES).forEach(k => { if (src[k] !== undefined) out[k] = snap(src[k], RANGES[k]); });
    Object.keys(BOOLS).forEach(k => {
      if (typeof src[k] === 'boolean') out[k] = src[k];
      else if (src[k] === 'true' || src[k] === 'false') out[k] = src[k] === 'true';
    });
    if (src.calibration && typeof src.calibration === 'object') {
      ['head', 'eye'].forEach(m => {
        const c = src.calibration[m];
        if (c && ['cx', 'cy', 'sx', 'sy'].every(k => Number.isFinite(c[k]))) out.calibration[m] = { cx: c.cx, cy: c.cy, sx: c.sx, sy: c.sy };
      });
    }
    return out;
  }

  /** steadiness 0…1 → One Euro minCutoff (Hz). More steady = lower cut-off. */
  function steadinessToCutoff(s) { return +(1.0 - 0.8 * Math.min(1, Math.max(0, s))).toFixed(3); }

  const KEY = 'ensaf-settings';

  const Settings = {
    RANGES, ENUMS, DEFAULTS, sanitizeSettings, steadinessToCutoff,
    _data: null,
    _listeners: [],

    load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
      if (!raw) {
        raw = {};
        try {
          // Migrate pre-2026 keys.
          const t = localStorage.getItem('ensaf-theme');
          const l = localStorage.getItem('ensaf-lang');
          if (t) raw.theme = t;
          if (l) raw.lang = l;
          if (!t && root.matchMedia && root.matchMedia('(prefers-contrast: more)').matches) raw.theme = 'contrast';
        } catch (e) { /* storage blocked */ }
      }
      this._data = sanitizeSettings(raw);
      return this._data;
    },

    get(key) { if (!this._data) this.load(); return key ? this._data[key] : { ...this._data }; },

    set(patch, { silent = false } = {}) {
      if (!this._data) this.load();
      const before = this._data;
      this._data = sanitizeSettings({ ...before, ...patch, calibration: { ...before.calibration, ...(patch.calibration || {}) } });
      if (patch.calibration === null) this._data.calibration = {};
      this.save();
      const changed = Object.keys(this._data).filter(k => JSON.stringify(before[k]) !== JSON.stringify(this._data[k]));
      if (!silent && changed.length) this._listeners.forEach(cb => { try { cb(this._data, changed); } catch (e) { console.error(e); } });
      return this._data;
    },

    step(key, dir) {
      const r = RANGES[key];
      if (!r) return this.get(key);
      return this.set({ [key]: this.get(key) + dir * r.step })[key];
    },

    reset() { const lang = this.get('lang'); return this.set({ ...DEFAULTS, lang, calibration: null }); },

    save() { try { localStorage.setItem(KEY, JSON.stringify(this._data)); } catch (e) { /* private mode */ } },

    onChange(cb) { this._listeners.push(cb); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { sanitizeSettings, steadinessToCutoff, DEFAULTS, RANGES };
  else root.Settings = Settings;
})(typeof window !== 'undefined' ? window : globalThis);
