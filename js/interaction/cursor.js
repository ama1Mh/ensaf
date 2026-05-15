/**
 * Cursor Manager - Handles cursor visual state and rendering
 * Supports both head tracking and eye tracking modes
 */
const CursorManager = (() => {
  let cursorElement = null;
  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let isVisible = false;
  let mode = 'head'; // 'head', 'eye', 'mouse'
  
  // Cursor styles for different modes
  const styles = {
    head: {
      size: 28,
      color: '#00f0ff',
      shadow: '0 0 18px rgba(0,240,255,0.8)'
    },
    eye: {
      size: 20,
      color: '#8b5cf6',
      shadow: '0 0 14px rgba(139,92,246,0.6)'
    },
    mouse: {
      size: 24,
      color: '#10b981',
      shadow: '0 0 16px rgba(16,185,129,0.6)'
    }
  };

  function init() {
    cursorElement = document.getElementById('cursor');
    if (!cursorElement) {
      cursorElement = document.createElement('div');
      cursorElement.id = 'cursor';
      cursorElement.style.cssText = `
        position: fixed;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        display: none;
        transition: width 0.2s, height 0.2s, border-color 0.2s, box-shadow 0.2s;
      `;
      document.body.appendChild(cursorElement);
    }
  }

  /**
   * Show cursor on screen
   */
  function show() {
    if (cursorElement) {
      cursorElement.style.display = 'block';
      isVisible = true;
    }
  }

  /**
   * Hide cursor
   */
  function hide() {
    if (cursorElement) {
      cursorElement.style.display = 'none';
      isVisible = false;
    }
  }

  /**
   * Update cursor position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  function move(x, y) {
    currentX = x;
    currentY = y;
    
    if (cursorElement && isVisible) {
      cursorElement.style.left = x + 'px';
      cursorElement.style.top = y + 'px';
    }
  }

  /**
   * Set cursor mode (changes appearance)
   * @param {string} newMode - 'head', 'eye', or 'mouse'
   */
  function setMode(newMode) {
    mode = newMode;
    const style = styles[mode] || styles.head;
    
    if (cursorElement) {
      cursorElement.style.width = style.size + 'px';
      cursorElement.style.height = style.size + 'px';
      cursorElement.style.background = `
        radial-gradient(
          circle,
          ${style.color} 0%,
          ${style.color}88 65%,
          transparent 100%
        )
      `;
      cursorElement.style.border = `2px solid ${style.color}`;
      cursorElement.style.boxShadow = style.shadow;
    }
    
    EVENTS.emit('cursor:mode', { mode: newMode });
  }

  /**
   * Update cursor based on tracking confidence
   * @param {number} confidence - 0-1 confidence value
   */
  function updateConfidence(confidence) {
    if (!cursorElement) return;
    
    if (confidence > 0.55) {
      cursorElement.classList.remove('low');
    } else if (confidence > 0.25) {
      cursorElement.classList.add('low');
    } else {
      cursorElement.classList.remove('low');
      cursorElement.style.opacity = Math.max(0.3, confidence);
    }
  }

  /**
   * Set cursor size
   * @param {number} size - Size in pixels
   */
  function setSize(size) {
    if (cursorElement) {
      cursorElement.style.width = size + 'px';
      cursorElement.style.height = size + 'px';
    }
  }

  /**
   * Get current cursor position
   * @returns {{x: number, y: number}}
   */
  function getPosition() {
    return { x: currentX, y: currentY };
  }

  /**
   * Animate cursor pulse (for calibration feedback)
   */
  function pulse() {
    if (cursorElement) {
      cursorElement.style.animation = 'pulse 0.6s ease';
      setTimeout(() => {
        cursorElement.style.animation = '';
      }, 600);
    }
  }

  return {
    init,
    show,
    hide,
    move,
    setMode,
    updateConfidence,
    setSize,
    getPosition,
    pulse
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  CursorManager.init();
});