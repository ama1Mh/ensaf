/**
 * DwellCore — the dwell-selection state machine (pure logic, no DOM).
 *
 * Feed it, on every pointer update, which target is under the pointer
 * (an id, or null) plus the pointer position and the time. It tells you the
 * dwell progress (0…1) and when a selection happens.
 *
 * Safety rules for students who cannot simply "let go" of a pointer:
 *  - Leaving the target cancels the dwell (progress returns to 0). A short
 *    `graceMs` tolerates one-frame dropouts from tracking noise or a blink.
 *  - After a selection there is a cooldown (`cooldownMs`) during which
 *    nothing can be selected.
 *  - After a selection the controller is "disarmed" until the pointer has
 *    moved at least `rearmDistance` px away from where the selection
 *    happened (or rested on nothing). This prevents double selections and
 *    prevents a button that appears under a resting cursor on the next screen
 *    from being chosen by accident.
 */
(function (root) {
  'use strict';

  class DwellCore {
    constructor({ dwellMs = 3500, cooldownMs = 900, rearmDistance = 40, graceMs = 0 } = {}) {
      this.dwellMs = dwellMs;
      this.cooldownMs = cooldownMs;
      this.rearmDistance = rearmDistance;
      this.graceMs = graceMs;
      this.reset();
    }

    reset() {
      this.target = null;
      this.startTime = 0;
      this.lostAt = null;
      this.cooldownUntil = 0;
      this.armed = true;
      this.disarmPoint = null;
      this.movedAway = false;
    }

    /** Disarm without selecting (e.g. after a screen change or a click). */
    disarm(x, y, now) {
      this.target = null;
      this.lostAt = null;
      this.armed = false;
      this.movedAway = false;
      this.disarmPoint = (x === undefined || x === null) ? null : { x, y };
      if (now !== undefined) this.cooldownUntil = now + this.cooldownMs;
    }

    setDwellTime(ms) { this.dwellMs = ms; }

    /**
     * @param {string|null} targetId
     * @param {number} x
     * @param {number} y
     * @param {number} now  ms
     * @returns {{target:string|null, progress:number, selected:string|null, blocked:boolean}}
     */
    update(targetId, x, y, now) {
      // ── Re-arm check ──
      if (!this.armed) {
        // Remember that the pointer has left, even if it comes back before the
        // cooldown ends (a quick "away and back" must not leave it stuck).
        if (!this.disarmPoint || targetId === null ||
            Math.hypot(x - this.disarmPoint.x, y - this.disarmPoint.y) >= this.rearmDistance) {
          this.movedAway = true;
        }
        if (this.movedAway && now >= this.cooldownUntil) {
          this.armed = true;
          this.disarmPoint = null;
          this.movedAway = false;
        }
      }

      if (!this.armed || now < this.cooldownUntil) {
        this.target = null;
        return { target: null, progress: 0, selected: null, blocked: true };
      }

      // ── Target tracking with a short grace period ──
      if (targetId === null && this.target !== null && this.graceMs > 0) {
        if (this.lostAt === null) this.lostAt = now;
        if (now - this.lostAt <= this.graceMs) {
          // Keep the current target; progress is frozen during the dropout.
          const progress = Math.min(1, (this.lostAt - this.startTime) / this.dwellMs);
          return { target: this.target, progress, selected: null, blocked: false };
        }
      }
      if (targetId !== null && targetId === this.target && this.lostAt !== null) {
        // Came back within the grace period: discount the time spent away.
        this.startTime += now - this.lostAt;
        this.lostAt = null;
      }

      if (targetId !== this.target) {
        this.target = targetId;
        this.startTime = now;
        this.lostAt = null;
      }

      if (this.target === null) {
        return { target: null, progress: 0, selected: null, blocked: false };
      }

      const progress = Math.min(1, (now - this.startTime) / this.dwellMs);
      if (progress >= 1) {
        const selected = this.target;
        this.disarm(x, y, now);
        return { target: selected, progress: 1, selected, blocked: false };
      }
      return { target: this.target, progress, selected: null, blocked: false };
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DwellCore };
  else root.DwellCore = DwellCore;
})(typeof window !== 'undefined' ? window : globalThis);
