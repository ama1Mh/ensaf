/**
 * VoiceManager — text-to-speech (Web Speech API) for ar / en / zh.
 *
 *  - Speech never overlaps: every speak() cancels the previous utterance.
 *  - The voice follows the interface language (setLang) and the best
 *    installed voice is chosen (pickVoice): exact locale > same language,
 *    natural/neural/online voices preferred. If no voice exists for the
 *    language, the utterance still carries `lang` so the browser can do its
 *    best, and onMissingVoice() is called once so the UI can tell the user.
 *  - Mute and rate come from Settings.
 */
(function (root) {
  'use strict';

  /** Pure: choose the best voice for a BCP-47 language tag. */
  function pickVoice(voices, lang) {
    if (!voices || !voices.length || !lang) return null;
    const want = lang.toLowerCase().replace('_', '-');
    const base = want.split('-')[0];
    let best = null, bestScore = 0;
    voices.forEach(v => {
      const vl = String(v.lang || '').toLowerCase().replace('_', '-');
      let score = 0;
      if (vl === want) score = 100;
      else if (vl.split('-')[0] === base) score = 60;
      else return;
      const name = String(v.name || '');
      if (/natural|neural|online|premium|enhanced/i.test(name)) score += 15;
      if (/google/i.test(name)) score += 10;
      if (v.localService) score += 3;
      if (v.default) score += 2;
      if (score > bestScore) { best = v; bestScore = score; }
    });
    return best;
  }

  const synth = (typeof window !== 'undefined') ? window.speechSynthesis : null;
  let voices = [];
  let currentLang = 'ar-SA';
  let enabled = true;
  let rate = 0.9;
  let current = null;
  const warned = new Set();
  const listeners = { start: [], end: [], missing: [] };

  function loadVoices() { try { voices = synth ? synth.getVoices() || [] : []; } catch (e) { voices = []; } }

  function emit(type, arg) { listeners[type].forEach(cb => { try { cb(arg); } catch (e) { console.error(e); } }); }

  function checkMissing() {
    if (!voices.length) return; // not loaded yet
    if (!pickVoice(voices, currentLang) && !warned.has(currentLang)) {
      warned.add(currentLang);
      emit('missing', currentLang);
    }
  }

  function clean(text) {
    return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  function speak(text) {
    if (!synth) return;
    const t = clean(text);
    stop();
    if (!enabled || !t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = currentLang;
    u.rate = rate;
    u.pitch = 1;
    const v = pickVoice(voices, currentLang);
    if (v) u.voice = v;
    u.onstart = () => emit('start');
    u.onend = u.onerror = () => { if (current === u) current = null; emit('end'); };
    current = u;
    synth.speak(u);
  }

  function stop() {
    if (!synth) return;
    current = null;
    try { synth.cancel(); } catch (e) { /* ignore */ }
    emit('end');
  }

  function setLang(lang) { currentLang = lang; checkMissing(); }
  function getLang() { return currentLang; }
  function setEnabled(on) { enabled = !!on; if (!enabled) stop(); }
  function isEnabled() { return enabled; }
  function setRate(r) { rate = Math.min(1.5, Math.max(0.5, Number(r) || 0.9)); }
  function isSpeaking() { return !!(synth && synth.speaking); }
  function on(type, cb) { if (listeners[type]) listeners[type].push(cb); }
  function getVoiceName() { const v = pickVoice(voices, currentLang); return v ? v.name : null; }

  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', () => { loadVoices(); checkMissing(); });
    else synth.onvoiceschanged = () => { loadVoices(); checkMissing(); };
  }

  const api = { speak, stop, setLang, getLang, setEnabled, isEnabled, setRate, isSpeaking, on, pickVoice, getVoiceName,
    toggle() { setEnabled(!enabled); return enabled; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = { pickVoice };
  else root.VoiceManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
