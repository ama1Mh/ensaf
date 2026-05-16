/**
 * Screen Router - Manages navigation between app screens
 * Handles transitions, history, and screen lifecycle
 *
 * URL scheme:
 *   /#/           → welcome   (sw)
 *   /#/login      → login
 *   /#/permission → sp
 *   /#/subjects   → ss
 *   /#/question   → sq
 *   /#/lesson     → sl
 *   /#/result     → sr
 *   /#/profile    → profile
 *
 * KEY FIX: Screens are hidden with display:none (not just .on class removal)
 * so they NEVER stack even if main.css fails to load.
 *
 * KEY FIX: Router boots AFTER window.SCREENS_READY resolves, so all
 * screen fragments are in the DOM before the first navigate() runs.
 */
class ScreenRouter {
  constructor() {
    this.screens        = new Map();
    this.currentScreen  = null;
    this.previousScreen = null;
    this.transitioning  = false;
    this._skipNextHash  = false;

    // Short name → DOM element id
    this.screenMap = {
      'welcome':    'sw',
      'permission': 'sp',
      'subjects':   'ss',
      'question':   'sq',
      'lesson':     'sl',
      'result':     'sr',
      'login':      'login',
      'profile':    'profile',
    };

    // URL slug → screen name
    this.slugToScreen = {
      '':           'welcome',
      'welcome':    'welcome',
      'permission': 'permission',
      'subjects':   'subjects',
      'question':   'question',
      'lesson':     'lesson',
      'result':     'result',
      'login':      'login',
      'profile':    'profile',
    };

    // Screen name → URL slug
    this.screenToSlug = {
      'welcome':    '',
      'permission': 'permission',
      'subjects':   'subjects',
      'question':   'question',
      'lesson':     'lesson',
      'result':     'result',
      'login':      'login',
      'profile':    'profile',
    };

    // Browser back / forward
    window.addEventListener('popstate', () => {
      if (this._skipNextHash) { this._skipNextHash = false; return; }
      this._navigateFromHash();
    });

    // Boot only after screen-loader has finished injecting all fragments
    this._waitAndBoot();
  }

  // ── Private ────────────────────────────────────────────────────

  async _waitAndBoot() {
    // Hide anything already in the DOM immediately
    this._hideAll();

    // Wait for screen-loader.js to finish fetching & injecting fragments
    if (window.SCREENS_READY) {
      await window.SCREENS_READY;
    } else if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    // Hide again now that fragments are in DOM
    this._hideAll();

    // Navigate to whatever the current URL says
    this._navigateFromHash();
  }

  _hideAll() {
    document.querySelectorAll('.scr').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('on');
    });
  }

  _navigateFromHash() {
    const raw  = location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
    const name = this.slugToScreen[raw] ?? 'welcome';
    this.navigate(name, { _fromHash: true });
  }

  // ── Public API ─────────────────────────────────────────────────

  register(id, element, options = {}) {
    this.screens.set(id, {
      element,
      onEnter:    options.onEnter    || null,
      onLeave:    options.onLeave    || null,
      transition: options.transition || 'fade',
    });
  }

  /**
   * Navigate to a screen.
   * Accepts: long names ('welcome','subjects'…), short codes ('sw','ss'…),
   * or the legacy 1-letter codes ('w','s','p','q','l','r') that app.js uses.
   */
  navigate(screenId, params = {}) {
    if (this.transitioning) return;

    // Resolve to DOM element id
    const mappedId = this.screenMap[screenId] || screenId;

    // Auto-register on first visit
    if (!this.screens.has(mappedId)) {
      const element = document.getElementById(mappedId);
      if (element) {
        this.register(mappedId, element);
      } else {
        console.warn(`[Router] Screen element not found: #${mappedId} (requested: "${screenId}")`);
        return;
      }
    }

    const target  = this.screens.get(mappedId);
    const current = this.currentScreen ? this.screens.get(this.currentScreen) : null;

    this.transitioning = true;

    // Update browser URL
    if (!params._fromHash) {
      const nameKey = Object.keys(this.screenMap).find(k => this.screenMap[k] === mappedId) || screenId;
      const slug    = this.screenToSlug[nameKey] ?? mappedId;
      const newHash = slug === '' ? '#/' : `#/${slug}`;
      if (location.hash !== newHash) {
        this._skipNextHash = true;
        history.pushState({ screen: mappedId }, '', newHash);
      }
    }

    if (current?.onLeave) current.onLeave(params);

    this._transition(current, target, () => {
      this.previousScreen = this.currentScreen;
      this.currentScreen  = mappedId;
      this.transitioning  = false;

      if (target.onEnter) target.onEnter(params);

      if (typeof EVENTS !== 'undefined' && typeof EVENT_NAMES !== 'undefined') {
        EVENTS.emit(EVENT_NAMES.SCREEN_CHANGE, {
          screen:   mappedId,
          previous: this.previousScreen,
          params,
        });
      }
    });
  }

  back() {
    if (this.previousScreen) this.navigate(this.previousScreen);
    else history.back();
  }

  getCurrentScreen() { return this.currentScreen; }

  isActive(screenId) {
    return this.currentScreen === (this.screenMap[screenId] || screenId);
  }

  reload() {
    if (this.currentScreen) {
      const screen = this.screens.get(this.currentScreen);
      if (screen?.onEnter) screen.onEnter({});
    }
  }

  // ── Transition engine ──────────────────────────────────────────

  _transition(from, to, callback) {
    // Hide ALL — class AND inline style — so nothing stacks
    document.querySelectorAll('.scr').forEach(el => {
      el.classList.remove('on');
      el.style.display = 'none';
    });

    if (to?.element) {
      to.element.style.display = '';   // hand back to CSS for layout
      to.element.classList.add('on');
    }

    setTimeout(callback, 50);
  }
}

const ROUTER = new ScreenRouter();