/**
 * i18n — translation lookup + DOM application.
 *
 * Lookup order: current language → Arabic (the reference language) → English
 * → the key itself (so a missing key is visible to developers, never blank).
 *
 * DOM attributes understood by I18N.apply(root):
 *   data-i18n="key"              → textContent
 *   data-i18n-placeholder="key"  → placeholder
 *   data-i18n-aria-label="key"   → aria-label
 *   data-i18n-title="key"        → title
 *   data-i18n-alt="key"          → alt
 */
(function (root) {
  'use strict';

  const SUPPORTED = ['ar', 'en', 'zh'];
  const RTL = new Set(['ar']);
  const SPEECH_LANG = { ar: 'ar-SA', en: 'en-US', zh: 'zh-CN' };

  function normalizeLang(lang) {
    const base = String(lang || '').toLowerCase().split('-')[0];
    return SUPPORTED.includes(base) ? base : 'ar';
  }

  function translate(table, lang, key, vars = {}) {
    const l = normalizeLang(lang);
    let msg = table[l] && table[l][key];
    if (msg === undefined) msg = table.ar && table.ar[key];
    if (msg === undefined) msg = table.en && table.en[key];
    if (msg === undefined) msg = key;
    return Object.keys(vars).reduce(
      (text, k) => text.split(`{${k}}`).join(String(vars[k])),
      String(msg)
    );
  }

  function dirFor(lang) { return RTL.has(normalizeLang(lang)) ? 'rtl' : 'ltr'; }
  function speechLangFor(lang) { return SPEECH_LANG[normalizeLang(lang)]; }

  const I18N = {
    SUPPORTED,
    lang: 'ar',
    table: (root && root.TRANSLATIONS) || {},
    normalizeLang,
    dirFor,
    speechLangFor,
    translate,

    t(key, vars) { return translate(this.table, this.lang, key, vars); },

    setLang(lang) {
      this.lang = normalizeLang(lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = this.lang;
        document.documentElement.dir = dirFor(this.lang);
      }
      return this.lang;
    },

    apply(scope) {
      if (typeof document === 'undefined') return;
      const rootEl = scope || document;
      const map = [
        ['data-i18n', (el, v) => { el.textContent = v; }],
        ['data-i18n-placeholder', (el, v) => { el.setAttribute('placeholder', v); }],
        ['data-i18n-aria-label', (el, v) => { el.setAttribute('aria-label', v); }],
        ['data-i18n-title', (el, v) => { el.setAttribute('title', v); }],
        ['data-i18n-alt', (el, v) => { el.setAttribute('alt', v); }]
      ];
      map.forEach(([attr, setter]) => {
        rootEl.querySelectorAll(`[${attr}]`).forEach(el => setter(el, this.t(el.getAttribute(attr))));
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { I18N, translate, normalizeLang, dirFor, speechLangFor };
  else root.I18N = I18N;
})(typeof window !== 'undefined' ? window : globalThis);
