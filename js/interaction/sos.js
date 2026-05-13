/**
 * SOS Emergency System
 * Provides one-click (or gaze-dwell) emergency exit for users
 */
const SOSSystem = (() => {
  let sosButton = null;
  let sosSVG = null;
  let sosCircle = null;
  let sosModal = null;
  
  let dwellStartTime = null;
  let isActive = false;
  let isModalOpen = false;
  
  const DWELL_DURATION = 3000; // 3 seconds to activate
  const CIRCUMFERENCE = 164;   // SVG circle circumference

  function init() {
    sosButton = document.getElementById('sos');
    sosSVG = document.getElementById('sosa');
    sosCircle = document.getElementById('sosc');
    sosModal = document.getElementById('sosm');
    
    if (sosButton) {
      sosButton.addEventListener('click', triggerImmediate);
    }
  }

  /**
   * Show SOS button (called when tracking is active)
   */
  function show() {
    if (sosButton) sosButton.classList.add('show');
    if (sosSVG) sosSVG.classList.add('show');
    isActive = true;
  }

  /**
   * Hide SOS button
   */
  function hide() {
    if (sosButton) sosButton.classList.remove('show');
    if (sosSVG) sosSVG.classList.remove('show');
    isActive = false;
    resetDwell();
  }

  /**
   * Check if gaze is over SOS button
   * @param {number} x - Cursor X position
   * @param {number} y - Cursor Y position
   */
  function checkProximity(x, y) {
    if (!isActive || !sosButton) return;
    
    const rect = sosButton.getBoundingClientRect();
    const distance = Math.hypot(
      x - (rect.left + rect.width / 2),
      y - (rect.top + rect.height / 2)
    );
    
    if (distance < 40) {
      if (!dwellStartTime) {
        dwellStartTime = performance.now();
      }
      
      const elapsed = performance.now() - dwellStartTime;
      const progress = Math.min(1, elapsed / DWELL_DURATION);
      
      // Update SVG circle
      if (sosCircle) {
        sosCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
      }
      
      // Trigger if dwell complete
      if (progress >= 1) {
        trigger();
      }
      
      return progress;
    } else {
      resetDwell();
      return 0;
    }
  }

  /**
   * Trigger SOS immediately (click)
   */
  function triggerImmediate() {
    trigger();
  }

  /**
   * Trigger SOS mode
   */
  function trigger() {
    if (isModalOpen) return;
    
    isModalOpen = true;
    resetDwell();
    
    // Show modal
    if (sosModal) {
      sosModal.style.display = 'flex';
      sosModal.classList.add('on');
    }
    
    // Pause tracking (optional - keeps cursor visible but stops dwell)
    EVENTS.emit(EVENT_NAMES.SOS_TRIGGER);
    
    // Audio feedback
    if (typeof Voice !== 'undefined') {
      Voice.speak('تم تفعيل وضع الطوارئ. اختر أحد الخيارات.');
    }
    
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  /**
   * Close SOS modal and resume
   */
  function close() {
    isModalOpen = false;
    
    if (sosModal) {
      sosModal.classList.remove('on');
      setTimeout(() => {
        sosModal.style.display = 'none';
      }, 300);
    }
    
    EVENTS.emit(EVENT_NAMES.SOS_CLOSE);
  }

  /**
   * Check if SOS is currently triggered
   * @returns {boolean}
   */
  function isTriggered() {
    return isModalOpen;
  }

  /**
   * Reset dwell timer
   */
  function resetDwell() {
    dwellStartTime = null;
    if (sosCircle) {
      sosCircle.style.strokeDashoffset = CIRCUMFERENCE;
    }
  }

  /**
   * Get remaining dwell time for SOS
   * @returns {number} Milliseconds remaining
   */
  function getRemainingTime() {
    if (!dwellStartTime) return DWELL_DURATION;
    const elapsed = performance.now() - dwellStartTime;
    return Math.max(0, DWELL_DURATION - elapsed);
  }

  return {
    init,
    show,
    hide,
    checkProximity,
    trigger,
    triggerImmediate,
    close,
    isTriggered,
    getRemainingTime
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  SOSSystem.init();
});