/**
 * Pointer simulator + accuracy benchmark (pure logic).
 *
 * Produces a reproducible stream of noisy "head-tracking" cursor samples and
 * runs a target-selection test through either
 *   - the LEGACY pipeline (EMA α=0.10 + original dwell: 30 px padding,
 *     first-match hit test, no cooldown), or
 *   - the NEW pipeline (One Euro + dead zone + DwellCore with sticky target,
 *     grace period, cooldown and re-arm).
 *
 * The noise model approximates MediaPipe nose-landmark jitter after the head
 * mapping (white noise), a 4 Hz physiological/pathological tremor, and rare
 * tracking glitches (single-frame jumps). It is NOT a replacement for testing
 * with a real webcam — it makes before/after comparisons repeatable.
 *
 * Used by tests/bench/accuracy-sim.js (Node) and screens/accuracy-test.html.
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const F = isNode ? require('./filters.js') : root;
  const D = isNode ? require('./dwell-core.js') : root;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Grid of target rectangles centred in the viewport. */
  function makeGrid({ width = 1366, height = 768, cols = 4, rows = 3, tw = 180, th = 110, gap = 24 } = {}) {
    const totalW = cols * tw + (cols - 1) * gap;
    const totalH = rows * th + (rows - 1) * gap;
    const x0 = (width - totalW) / 2;
    const y0 = (height - totalH) / 2;
    const rects = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = x0 + c * (tw + gap);
        const top = y0 + r * (th + gap);
        rects.push({ id: String(r * cols + c), left, top, right: left + tw, bottom: top + th });
      }
    }
    return rects;
  }

  const inRect = (x, y, r, pad = 0) =>
    x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

  /** New hit test: keep the current target while inside it + stickyPad (hysteresis). */
  function pickTargetSticky(x, y, rects, currentId, stickyPad = 14) {
    if (currentId !== null) {
      const cur = rects.find(r => r.id === currentId);
      if (cur && inRect(x, y, cur, stickyPad)) return currentId;
    }
    const hit = rects.find(r => inRect(x, y, r, 0));
    return hit ? hit.id : null;
  }

  /** Legacy hit test: first rect within 30 px padding wins (rects overlap!). */
  function pickTargetLegacy(x, y, rects) {
    const hit = rects.find(r => inRect(x, y, r, 30));
    return hit ? hit.id : null;
  }

  /** Legacy dwell (copy of the original DwellSystem logic, minus the DOM). */
  class LegacyDwell {
    constructor(dwellMs) { this.dwellMs = dwellMs; this.active = null; this.start = 0; }
    update(id, now) {
      if (id !== this.active) { this.active = id; this.start = now; }
      if (id === null) return null;
      if (now - this.start >= this.dwellMs) { this.active = null; return id; }
      return null;
    }
  }

  const DEFAULT_NOISE = { white: 14, tremorAmp: 8, tremorHz: 4, glitchRate: 0.02, glitchPx: 80, aimSigma: 18 };

  /**
   * Run a simulated accuracy test.
   * @returns {{pipeline, trials, hits, falseSelections, timeouts, hitRate, meanTimeMs, medianTimeMs}}
   */
  function runSimulation({
    pipeline = 'new', seed = 1, trials = 60, dwellMs = 2000, fps = 30,
    viewport = { width: 1366, height: 768 }, grid = {}, noise = {}, timeoutMs = 10000,
    filterOpts = { minCutoff: 0.4, beta: 0.002, deadZone: 5 }
  } = {}) {
    const rand = mulberry32(seed);
    const N = { ...DEFAULT_NOISE, ...noise };
    const rects = makeGrid({ ...viewport, ...grid });
    const dt = 1000 / fps;

    const filter = pipeline === 'legacy'
      ? new F.LegacyEmaFilter(0.10)
      : new F.PointFilter(filterOpts);
    const core = pipeline === 'legacy'
      ? new LegacyDwell(dwellMs)
      : new D.DwellCore({ dwellMs, cooldownMs: 900, rearmDistance: 40, graceMs: 150 });

    let t = 0;
    let pos = { x: viewport.width / 2, y: viewport.height / 2 };   // true head-pointer position
    let current = null;                                               // sticky target id
    const times = [];
    let hits = 0, falseSel = 0, timeouts = 0;

    // Target order: random but never the same twice in a row.
    let last = -1;
    for (let k = 0; k < trials; k++) {
      let idx;
      do { idx = Math.floor(rand() * rects.length); } while (idx === last);
      last = idx;
      const target = rects[idx];
      const cx = (target.left + target.right) / 2;
      const cy = (target.top + target.bottom) / 2;
      // Where the student actually aims (not exactly the centre).
      const aim = { x: cx + gaussian(rand) * N.aimSigma, y: cy + gaussian(rand) * N.aimSigma * 0.6 };
      const from = { ...pos };
      const reaction = 250 + rand() * 200;
      const moveMs = 500 + Math.hypot(aim.x - from.x, aim.y - from.y) * 0.9;
      const onset = t;
      let firstWrongCounted = false;
      let done = false;

      while (!done) {
        t += dt;
        const e = t - onset;
        // Minimum-jerk movement profile after the reaction time.
        let s = 0;
        if (e > reaction) {
          const u = Math.min(1, (e - reaction) / moveMs);
          s = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
        }
        pos = { x: from.x + (aim.x - from.x) * s, y: from.y + (aim.y - from.y) * s };

        // Sensor + tremor + glitches.
        const tremor = Math.sin(2 * Math.PI * N.tremorHz * t / 1000);
        let mx = pos.x + gaussian(rand) * N.white + tremor * N.tremorAmp;
        let my = pos.y + gaussian(rand) * N.white + Math.cos(2 * Math.PI * N.tremorHz * t / 1000) * N.tremorAmp * 0.6;
        if (rand() < N.glitchRate) { mx += (rand() - 0.5) * 2 * N.glitchPx; my += (rand() - 0.5) * 2 * N.glitchPx; }

        const p = pipeline === 'legacy' ? filter.filter(mx, my) : filter.filter(mx, my, t);

        let selected = null;
        if (pipeline === 'legacy') {
          selected = core.update(pickTargetLegacy(p.x, p.y, rects), t);
        } else {
          current = pickTargetSticky(p.x, p.y, rects, current);
          const res = core.update(current, p.x, p.y, t);
          selected = res.selected;
          if (selected) current = null;
        }

        if (selected !== null) {
          if (selected === target.id) {
            if (!firstWrongCounted) hits++;
            times.push(t - onset);
            done = true;
          } else {
            falseSel++;
            firstWrongCounted = true;
          }
        }
        if (!done && e > timeoutMs) { timeouts++; done = true; }
      }
    }

    times.sort((a, b) => a - b);
    const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const median = times.length ? times[Math.floor(times.length / 2)] : 0;
    return {
      pipeline, trials, hits, falseSelections: falseSel, timeouts,
      hitRate: hits / trials,
      meanTimeMs: Math.round(mean),
      medianTimeMs: Math.round(median)
    };
  }

  /** Cursor jitter while holding still: RMS distance of output from the true point. */
  function measureRestJitter({ pipeline = 'new', seed = 7, seconds = 10, fps = 30, noise = {}, filterOpts = { minCutoff: 0.4, beta: 0.002, deadZone: 5 } } = {}) {
    const rand = mulberry32(seed);
    const N = { ...DEFAULT_NOISE, ...noise };
    const filter = pipeline === 'legacy' ? new F.LegacyEmaFilter(0.10) : new F.PointFilter(filterOpts);
    const dt = 1000 / fps;
    let sum = 0, n = 0, moves = 0, prev = null;
    for (let t = 0; t < seconds * 1000; t += dt) {
      const tremor = Math.sin(2 * Math.PI * N.tremorHz * t / 1000);
      let mx = 500 + gaussian(rand) * N.white + tremor * N.tremorAmp;
      let my = 400 + gaussian(rand) * N.white;
      if (rand() < N.glitchRate) { mx += (rand() - 0.5) * 2 * N.glitchPx; my += (rand() - 0.5) * 2 * N.glitchPx; }
      const p = pipeline === 'legacy' ? filter.filter(mx, my) : filter.filter(mx, my, t);
      if (t > 1000) { sum += (p.x - 500) ** 2 + (p.y - 400) ** 2; n++; }
      if (prev && (p.x !== prev.x || p.y !== prev.y)) moves++;
      prev = p;
    }
    return { pipeline, rmsPx: +Math.sqrt(sum / n).toFixed(2), movingFramesPct: +(100 * moves / (seconds * fps)).toFixed(1) };
  }

  /** Lag: time for the output to reach 90 % of a 400 px step. */
  function measureStepLag({ pipeline = 'new', fps = 30, filterOpts = { minCutoff: 0.4, beta: 0.002, deadZone: 5 } } = {}) {
    const filter = pipeline === 'legacy' ? new F.LegacyEmaFilter(0.10) : new F.PointFilter(filterOpts);
    const dt = 1000 / fps;
    let t = 0;
    for (; t < 1000; t += dt) pipeline === 'legacy' ? filter.filter(100, 100) : filter.filter(100, 100, t);
    // Smooth 300 ms head movement of 400 px, then hold.
    const start = t;
    for (; t < start + 4000; t += dt) {
      const u = Math.min(1, (t - start) / 300);
      const s = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
      const x = 100 + 400 * s;
      const p = pipeline === 'legacy' ? filter.filter(x, 100) : filter.filter(x, 100, t);
      if (p.x >= 100 + 0.9 * 400) return { pipeline, lag90Ms: Math.round(t - start) };
    }
    return { pipeline, lag90Ms: Infinity };
  }

  const api = { mulberry32, gaussian, makeGrid, pickTargetSticky, pickTargetLegacy, runSimulation, measureRestJitter, measureStepLag };
  if (isNode) module.exports = api;
  else root.PointerSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
