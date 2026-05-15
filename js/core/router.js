/**
 * Screen Router - Manages navigation between app screens
 * Handles transitions, history, and screen lifecycle
 */
class ScreenRouter {
  constructor() {
    this.screens = new Map();
    this.currentScreen = null;
    this.previousScreen = null;
    this.transitioning = false;
    
    // Screen ID mapping (short codes to DOM IDs)
    this.screenMap = {
      'welcome':   'sw',
      'permission': 'sp',
      'subjects':   'ss',
      'question':   'sq',
      'lesson':     'sl',
      'result':     'sr'
    };
  }

  /**
   * Register a screen
   * @param {string} id - Screen identifier
   * @param {HTMLElement} element - DOM element
   * @param {Object} options - Screen options
   */
  register(id, element, options = {}) {
    this.screens.set(id, {
      element,
      onEnter: options.onEnter || null,
      onLeave: options.onLeave || null,
      transition: options.transition || 'fade'
    });
  }

  /**
   * Navigate to a screen
   * @param {string} screenId - Target screen ID
   * @param {Object} params - Navigation parameters
   */
  navigate(screenId, params = {}) {
    if (this.transitioning) return;
    
    const mappedId = this.screenMap[screenId] || screenId;
    
    // Find target element if not registered
    if (!this.screens.has(mappedId)) {
      const element = document.getElementById(mappedId);
      if (element) {
        this.register(mappedId, element);
      } else {
        console.error(`[Router] Screen not found: ${mappedId}`);
        return;
      }
    }
    
    const target = this.screens.get(mappedId);
    const current = this.currentScreen ? this.screens.get(this.currentScreen) : null;
    
    this.transitioning = true;
    
    // Leave current screen
    if (current && current.onLeave) {
      current.onLeave(params);
    }
    
    // Transition
    this._transition(current, target, () => {
      // Update state
      this.previousScreen = this.currentScreen;
      this.currentScreen = mappedId;
      this.transitioning = false;
      
      // Enter new screen
      if (target.onEnter) {
        target.onEnter(params);
      }
      
      // Emit event
      EVENTS.emit(EVENT_NAMES.SCREEN_CHANGE, {
        screen: mappedId,
        previous: this.previousScreen,
        params
      });
    });
  }

  /**
   * Go back to previous screen
   */
  back() {
    if (this.previousScreen) {
      this.navigate(this.previousScreen);
    }
  }

  /**
   * Perform transition animation
   * @private
   */
  _transition(from, to, callback) {
    const allScreens = document.querySelectorAll('.scr');
    
    // Hide all screens first
    allScreens.forEach(screen => {
      screen.classList.remove('on');
    });
    
    // Show target screen
    if (to && to.element) {
      to.element.classList.add('on');
    }
    
    // Small delay for CSS transition to complete
    setTimeout(callback, 50);
  }

  /**
   * Get current screen ID
   * @returns {string|null}
   */
  getCurrentScreen() {
    return this.currentScreen;
  }

  /**
   * Check if a screen is active
   * @param {string} screenId
   * @returns {boolean}
   */
  isActive(screenId) {
    return this.currentScreen === (this.screenMap[screenId] || screenId);
  }

  /**
   * Force reload current screen
   */
  reload() {
    if (this.currentScreen) {
      this.navigate(this.currentScreen);
    }
  }
}

// Global router instance
const ROUTER = new ScreenRouter();