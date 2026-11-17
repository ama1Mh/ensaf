/**
 * Sounds — short, soft feedback tones made with Web Audio (no audio files,
 * no network). Optional: controlled by Settings "Feedback sounds".
 * Tones are brief and never loop, so they cannot become an alarm loop.
 */
(function (root) {
  'use strict';
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', gain = 0.12) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const patterns = {
    select:  () => tone(660, 0, 0.09, 'sine', 0.08),
    correct: () => { tone(660, 0, 0.12); tone(880, 0.12, 0.18); },
    wrong:   () => { tone(330, 0, 0.18, 'triangle'); tone(262, 0.18, 0.22, 'triangle'); },
    hint:    () => { tone(784, 0, 0.1, 'sine', 0.07); tone(988, 0.1, 0.14, 'sine', 0.07); },
    sos:     () => { [0, 0.35, 0.7].forEach(s => tone(880, s, 0.22, 'square', 0.09)); }
  };

  root.Sounds = {
    play(name) { if (enabled && patterns[name]) { try { patterns[name](); } catch (e) { /* ignore */ } } },
    setEnabled(on) { enabled = !!on; },
    unlock() { ac(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
