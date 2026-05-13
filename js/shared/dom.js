/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */
const DOM = {
  /**
   * Get element by ID
   */
  get(id) {
    return document.getElementById(id);
  },

  /**
   * Query selector
   */
  qs(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all
   */
  qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  /**
   * Create element with attributes and content
   */
  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'html') {
        el.innerHTML = value;
      } else if (key === 'text') {
        el.textContent = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    
    // Append children
    if (typeof children === 'string') {
      el.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          el.appendChild(child);
        }
      });
    }
    
    return el;
  },

  /**
   * Remove all children from element
   */
  empty(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    return element;
  },

  /**
   * Show element
   */
  show(element, display = 'flex') {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.style.display = display;
    }
    return element;
  },

  /**
   * Hide element
   */
  hide(element) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.style.display = 'none';
    }
    return element;
  },

  /**
   * Toggle element visibility
   */
  toggle(element, display = 'flex') {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      const isHidden = element.style.display === 'none';
      element.style.display = isHidden ? display : 'none';
    }
    return element;
  },

  /**
   * Add class to element
   */
  addClass(element, ...classes) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.classList.add(...classes);
    }
    return element;
  },

  /**
   * Remove class from element
   */
  removeClass(element, ...classes) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.classList.remove(...classes);
    }
    return element;
  },

  /**
   * Toggle class on element
   */
  toggleClass(element, className) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.classList.toggle(className);
    }
    return element;
  },

  /**
   * Set CSS custom property
   */
  setCSSVar(name, value, element = document.documentElement) {
    element.style.setProperty(name, value);
  },

  /**
   * Get CSS custom property
   */
  getCSSVar(name, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(name).trim();
  },

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  },

  /**
   * Get element's center point
   */
  getCenter(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  },

  /**
   * Set element position
   */
  setPosition(element, x, y) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      element.style.left = x + 'px';
      element.style.top = y + 'px';
    }
    return element;
  },

  /**
   * Animate element
   */
  animate(element, keyframes, options) {
    if (typeof element === 'string') element = this.get(element);
    if (element) {
      return element.animate(keyframes, options);
    }
    return null;
  },

  /**
   * Wait for element to be added to DOM
   */
  waitFor(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  },

  /**
   * Debounced resize handler
   */
  onResize(callback, delay = 250) {
    let timeout;
    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(callback, delay);
    });
  },

  /**
   * When DOM is ready
   */
  ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
};