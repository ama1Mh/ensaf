/**
 * HesitationTimer — fires once if the student has not answered within
 * `timeoutMs` (default 6 s) of a question appearing. Used for the automatic
 * hint. Pausable (SOS dialog / settings open) so the hint never pops up while
 * the student is dealing with something else.
 *
 * Timers are injectable so unit tests can use a fake clock.
 */
(function (root) {
  'use strict';

  class HesitationTimer {
    constructor({ timeoutMs = 6000, onHesitate = () => {}, setTimer, clearTimer, now } = {}) {
      this.timeoutMs = timeoutMs;
      this.onHesitate = onHesitate;
      this._set = setTimer || ((fn, ms) => setTimeout(fn, ms));
      this._clear = clearTimer || (id => clearTimeout(id));
      this._now = now || (() => Date.now());
      this._id = null;
      this._remaining = timeoutMs;
      this._startedAt = 0;
      this.fired = false;
      this.running = false;
    }

    start() {
      this.stop();
      this.fired = false;
      this._remaining = this.timeoutMs;
      this._arm();
    }

    _arm() {
      this.running = true;
      this._startedAt = this._now();
      this._id = this._set(() => {
        this._id = null;
        this.running = false;
        this.fired = true;
        this.onHesitate();
      }, this._remaining);
    }

    pause() {
      if (!this.running) return;
      this._clear(this._id);
      this._id = null;
      this.running = false;
      this._remaining = Math.max(0, this._remaining - (this._now() - this._startedAt));
    }

    resume() {
      if (this.running || this.fired || this._remaining <= 0) return;
      this._arm();
    }

    stop() {
      if (this._id !== null) this._clear(this._id);
      this._id = null;
      this.running = false;
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { HesitationTimer };
  else root.HesitationTimer = HesitationTimer;
})(typeof window !== 'undefined' ? window : globalThis);
