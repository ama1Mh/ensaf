/**
 * Cursor smoothing filters (pure logic — no DOM).
 *
 * OneEuroFilter — Casiez, Roussel & Vogel (CHI 2012), "1€ Filter: A Simple
 * Speed-based Low-pass Filter for Noisy Input in Interactive Systems".
 * It is a low-pass filter whose cut-off frequency rises with speed:
 *   - when the head/eye is still, the cut-off is low → jitter is removed;
 *   - when it moves quickly, the cut-off rises → little lag.
 * That is exactly the trade-off a dwell interface needs.
 *
 * PointFilter — applies a One Euro filter on each axis and then a small
 * dead zone: if the filtered point moved less than `deadZone` pixels from the
 * last *output* point, the output does not move. This keeps the cursor
 * perfectly still while the student holds still on a target.
 *
 * Works in the browser (globals) and in Node (module.exports) for unit tests.
 */
(function (root) {
  'use strict';

  function smoothingFactor(dt, cutoff) {
    const r = 2 * Math.PI * cutoff * dt;
    return r / (r + 1);
  }

  class LowPass {
    constructor() { this.y = null; }
    filter(x, a) {
      this.y = this.y === null ? x : a * x + (1 - a) * this.y;
      return this.y;
    }
    reset() { this.y = null; }
  }

  class OneEuroFilter {
    /**
     * @param {object} o
     * @param {number} o.minCutoff  Hz. Lower = smoother when still (default 1.0)
     * @param {number} o.beta       Speed coefficient. Higher = less lag when moving
     * @param {number} o.dCutoff    Hz cut-off for the derivative (default 1.0)
     */
    constructor({ minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 } = {}) {
      this.minCutoff = minCutoff;
      this.beta = beta;
      this.dCutoff = dCutoff;
      this.x = new LowPass();
      this.dx = new LowPass();
      this.lastTime = null;
      this.lastRaw = null;
    }

    /**
     * @param {number} value  raw sample
     * @param {number} timeMs timestamp in milliseconds
     */
    filter(value, timeMs) {
      if (this.lastTime === null) {
        this.lastTime = timeMs;
        this.lastRaw = value;
        this.dx.filter(0, 1);
        return this.x.filter(value, 1);
      }
      let dt = (timeMs - this.lastTime) / 1000;
      // Guard against duplicate / out-of-order timestamps.
      if (!(dt > 0)) dt = 1 / 60;
      this.lastTime = timeMs;

      const rawDx = (value - this.lastRaw) / dt;
      this.lastRaw = value;
      const edx = this.dx.filter(rawDx, smoothingFactor(dt, this.dCutoff));
      const cutoff = this.minCutoff + this.beta * Math.abs(edx);
      return this.x.filter(value, smoothingFactor(dt, cutoff));
    }

    reset() {
      this.x.reset();
      this.dx.reset();
      this.lastTime = null;
      this.lastRaw = null;
    }
  }

  class PointFilter {
    /**
     * @param {object} o
     * @param {number} o.minCutoff
     * @param {number} o.beta
     * @param {number} o.deadZone pixels; output holds still for smaller moves
     */
    constructor({ minCutoff = 1.0, beta = 0.007, dCutoff = 1.0, deadZone = 4 } = {}) {
      this.fx = new OneEuroFilter({ minCutoff, beta, dCutoff });
      this.fy = new OneEuroFilter({ minCutoff, beta, dCutoff });
      this.deadZone = deadZone;
      this.out = null;
    }

    configure({ minCutoff, beta, deadZone } = {}) {
      [this.fx, this.fy].forEach(f => {
        if (minCutoff !== undefined) f.minCutoff = minCutoff;
        if (beta !== undefined) f.beta = beta;
      });
      if (deadZone !== undefined) this.deadZone = deadZone;
    }

    filter(x, y, timeMs) {
      const sx = this.fx.filter(x, timeMs);
      const sy = this.fy.filter(y, timeMs);
      if (!this.out) {
        this.out = { x: sx, y: sy };
      } else if (Math.hypot(sx - this.out.x, sy - this.out.y) > this.deadZone) {
        this.out = { x: sx, y: sy };
      }
      return { x: this.out.x, y: this.out.y };
    }

    reset() {
      this.fx.reset();
      this.fy.reset();
      this.out = null;
    }
  }

  /** The original ENSAF smoothing (exponential moving average) — kept for the
   *  before/after accuracy comparison only. */
  class LegacyEmaFilter {
    constructor(alpha = 0.10) { this.alpha = alpha; this.out = null; }
    filter(x, y) {
      if (!this.out) this.out = { x, y };
      else {
        this.out = {
          x: this.out.x * (1 - this.alpha) + x * this.alpha,
          y: this.out.y * (1 - this.alpha) + y * this.alpha
        };
      }
      return { ...this.out };
    }
    reset() { this.out = null; }
  }

  const api = { OneEuroFilter, PointFilter, LegacyEmaFilter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
