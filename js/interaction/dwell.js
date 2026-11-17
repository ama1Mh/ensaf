/**
 * DwellController — hands-free "hold still to click" for EVERY interactive
 * element on screen (buttons, links, tabs, inputs, subject cards, answers,
 * dialog buttons, the SOS button…), in every input mode.
 *
 *  - Pointer positions come from the head/eye tracker or the mouse.
 *  - Target = interactive element under the pointer. While dwelling, the
 *    current target is "sticky" (kept while the pointer stays within its box
 *    plus STICKY_PX) so tracking jitter at the edge does not restart the timer.
 *  - Progress is shown as a ring on the cursor (--p) and a fill bar + thick
 *    outline on the element (.dwelling, --dwell-p).
 *  - Leaving the element cancels. Selection → cooldown + re-arm (DwellCore),
 *    and any real click/keypress also disarms, so nothing is chosen twice.
 *  - When a modal dialog is open only elements inside it can be selected.
 *  - Per-element dwell time: data-dwell-ms="3000" (used by SOS).
 *  - Opt out: data-no-dwell on an element or ancestor.
 */
(function (root) {
  'use strict';

  const SELECTOR = [
    'button:not([disabled])', 'a[href]', 'input:not([disabled]):not([type=hidden])', 'textarea:not([disabled])',
    'select:not([disabled])', '[role="button"]', '[role="tab"]', '[data-dwell]'
  ].join(',');
  const STICKY_PX = 14;

  const DwellController = {
    enabled: true,
    core: null,
    current: null,
    x: -1, y: -1,
    defaultMs: 3500,
    cursorEl: null,
    onSelect: null,      // optional hook (el) => void, called before activation
    _modalCheck: null,

    init({ dwellMs = 3500, cursor } = {}) {
      this.defaultMs = dwellMs;
      this.core = new root.DwellCore({ dwellMs, cooldownMs: 900, rearmDistance: 40, graceMs: 150 });
      this.cursorEl = cursor || document.getElementById('cursor');
      // A real click or key press also counts as a selection → disarm.
      document.addEventListener('click', e => {
        if (e.isTrusted) this.core.disarm(this.x, this.y, performance.now());
      }, true);
      document.addEventListener('keydown', () => this.core.disarm(this.x, this.y, performance.now()), true);
    },

    setDwellTime(ms) { this.defaultMs = ms; if (this.core) this.core.setDwellTime(ms); },

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this._clear();
    },

    /** Call after screen changes so a new button under a resting cursor is not auto-selected. */
    disarm() { if (this.core) this.core.disarm(this.x, this.y, performance.now()); this._clear(); },

    _activeModal() {
      const dlg = document.querySelector('dialog[open]');
      if (dlg) return dlg;
      const calib = document.getElementById('calib');
      return calib && calib.classList.contains('on') ? calib : null;
    },

    _visible(el) {
      if (!el || !el.isConnected) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none';
    },

    _hitTest(x, y) {
      const modal = this._activeModal();
      // Sticky: keep the current target while within its inflated box.
      if (this.current && this._visible(this.current) && (!modal || modal.contains(this.current))) {
        const r = this.current.getBoundingClientRect();
        if (x >= r.left - STICKY_PX && x <= r.right + STICKY_PX && y >= r.top - STICKY_PX && y <= r.bottom + STICKY_PX) {
          return this.current;
        }
      }
      const hit = document.elementFromPoint(x, y);
      if (!hit) return null;
      const el = hit.closest(SELECTOR);
      if (!el || el.closest('[data-no-dwell]') || el.getAttribute('aria-disabled') === 'true') return null;
      if (modal && !modal.contains(el)) return null;
      return this._visible(el) ? el : null;
    },

    update(x, y) {
      this.x = x; this.y = y;
      if (!this.enabled || !this.core) return;
      const now = performance.now();
      const el = this._hitTest(x, y);
      if (el !== this.current) {
        // Per-element dwell time (e.g. SOS 3 s) — set before the core starts timing.
        const ms = el && el.dataset.dwellMs ? Number(el.dataset.dwellMs) : this.defaultMs;
        this.core.setDwellTime(ms);
      }
      const res = this.core.update(el, x, y, now);
      this._render(res.target, res.progress);
      if (res.selected) this._activate(res.selected);
    },

    _render(target, progress) {
      if (this.current && this.current !== target) {
        this.current.classList.remove('dwelling');
        this.current.style.removeProperty('--dwell-p');
        this._sosRing(this.current, 0);
      }
      this.current = target;
      if (target) {
        target.classList.add('dwelling');
        target.style.setProperty('--dwell-p', progress.toFixed(3));
        this._sosRing(target, progress);
      }
      if (this.cursorEl) this.cursorEl.style.setProperty('--p', target ? progress.toFixed(3) : '0');
    },

    _sosRing(el, p) {
      if (el.id !== 'sos') return;
      const c = document.getElementById('sosc');
      if (c) c.style.strokeDashoffset = String(352 * (1 - p));
    },

    _clear() { this._render(null, 0); },

    _activate(el) {
      this._clear();
      el.classList.add('dwell-done');
      setTimeout(() => el.classList.remove('dwell-done'), 400);
      if (typeof this.onSelect === 'function') this.onSelect(el);
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        el.focus();
        if (tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) el.click();
        return;
      }
      el.focus({ preventScroll: true });
      el.click();
    }
  };

  root.DwellController = DwellController;
})(window);
