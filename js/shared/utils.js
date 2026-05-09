// Utility functions for ENSAF platform

const Utils = {
  // Screen dimensions
  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  },
  
  // Clamp a value between min and max
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  
  // Linear interpolation
  lerp(start, end, amount) {
    return start + (end - start) * amount;
  },
  
  // Map a value from one range to another
  mapRange(value, fromMin, fromMax, toMin, toMax) {
    return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
  },
  
  // Shuffle array (Fisher-Yates)
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  
  // Format time (seconds to mm:ss)
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Debounce function
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
  
  // Throttle function
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
  
  // Generate random ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  // Save to localStorage
  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(`ensaf_${key}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  },
  
  // Load from localStorage
  loadFromLocalStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`ensaf_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return defaultValue;
    }
  },
  
  // Get performance metrics
  getPerformanceMetrics(startTime, totalQuestions, score, hesitations) {
    const duration = (Date.now() - startTime) / 1000;
    const avgTimePerQuestion = duration / totalQuestions;
    const accuracy = (score / totalQuestions) * 100;
    
    return {
      duration,
      avgTimePerQuestion,
      accuracy,
      score,
      totalQuestions,
      hesitations
    };
  },
  
  // Create particles effect
  createParticles(containerId, count = 30) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const colors = [
      'rgba(0,240,255,0.3)',
      'rgba(109,40,217,0.3)',
      'rgba(251,191,36,0.2)',
      'rgba(16,185,129,0.2)'
    ];
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'pt';
      const size = Math.random() * 3 + 1;
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        background: ${colors[i % colors.length]};
        border-radius: 50%;
        animation: ptf ${Math.random() * 18 + 8}s linear infinite;
        animation-delay: ${Math.random() * 18}s;
        opacity: 0;
      `;
      container.appendChild(particle);
    }
  },
  
  // Check if element is in viewport
  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },
  
  // Smooth scroll to element
  scrollToElement(el, offset = 0) {
    if (!el) return;
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  },
  
  // Download data as JSON
  downloadJSON(data, filename = 'ensaf_data.json') {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error('Failed to copy:', e);
      return false;
    }
  },
  
  // Get device info
  getDeviceInfo() {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const browser = (() => {
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    })();
    
    return {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      browser,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };
  },
  
  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.ensaf-toast');
    if (existingToast) existingToast.remove();
    
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
  },
  
  // Add animation keyframes if not present
  addAnimationStyles() {
    if (document.getElementById('ensaf-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'ensaf-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      @keyframes ptf {
        0% {
          transform: translateY(100vh) scale(0);
          opacity: 0;
        }
        10% {
          opacity: 0.45;
        }
        90% {
          opacity: 0.1;
        }
        100% {
          transform: translateY(-5vh);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

// Initialize animations on load
document.addEventListener('DOMContentLoaded', () => {
  Utils.addAnimationStyles();
});