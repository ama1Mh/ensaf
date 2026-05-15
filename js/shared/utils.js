/**
 * Shared Utilities
 * Common helper functions used across the application
 */
const Utils = {
  /**
   * Clamp a value between min and max
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Linear interpolation
   */
  lerp(start, end, amount) {
    return start + (end - start) * this.clamp(amount, 0, 1);
  },

  /**
   * Map value from one range to another
   */
  mapRange(value, fromMin, fromMax, toMin, toMax) {
    const clamped = this.clamp(value, fromMin, fromMax);
    return toMin + (clamped - fromMin) * (toMax - toMin) / (fromMax - fromMin);
  },

  /**
   * Exponential Moving Average
   */
  ema(previous, current, alpha) {
    if (previous === null) return current;
    return previous * (1 - alpha) + current * alpha;
  },

  /**
   * Fisher-Yates shuffle
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Format seconds to mm:ss
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Check if point is inside rectangle
   */
  isPointInRect(px, py, rect, padding = 0) {
    return px >= rect.left - padding &&
           px <= rect.right + padding &&
           py >= rect.top - padding &&
           py <= rect.bottom + padding;
  },

  /**
   * Calculate distance between two points
   */
  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * Math.PI / 180;
  },

  /**
   * Convert radians to degrees
   */
  toDegrees(radians) {
    return radians * 180 / Math.PI;
  },

  /**
   * Calculate running mean and variance
   */
  runningStats(values) {
    if (!values.length) return { mean: 0, variance: 0 };
    
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    
    return { mean, variance, stdDev: Math.sqrt(variance) };
  },

  /**
   * Detect outlier using z-score
   */
  isOutlier(value, values, threshold = 2) {
    if (values.length < 3) return false;
    const { mean, stdDev } = this.runningStats(values);
    if (stdDev === 0) return false;
    return Math.abs(value - mean) / stdDev > threshold;
  },

  /**
   * Save to localStorage
   */
  saveToStorage(key, data) {
    try {
      localStorage.setItem(`ensaf_${key}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[Storage] Save failed:', e);
      return false;
    }
  },

  /**
   * Load from localStorage
   */
  loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`ensaf_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('[Storage] Load failed:', e);
      return defaultValue;
    }
  },

  /**
   * Get device info
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(ua),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod/i.test(ua),
      browser: ua.includes('Chrome') ? 'Chrome' :
               ua.includes('Firefox') ? 'Firefox' :
               ua.includes('Safari') ? 'Safari' :
               ua.includes('Edge') ? 'Edge' : 'Unknown',
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language
    };
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.ensaf-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `ensaf-toast ensaf-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: var(--c);
      border: 1px solid var(--${type === 'success' ? 'gr' : type === 'error' ? 're' : 'cy'});
      border-radius: var(--r);
      color: var(--t1);
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      direction: rtl;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};
