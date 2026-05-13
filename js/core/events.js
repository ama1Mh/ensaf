/**
 * Event Bus for decoupled communication between modules
 * Implements pub/sub pattern for clean architecture
 */
class EventBus {
  constructor() {
    this._events = new Map();
    this._onceEvents = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @param {Object} context - 'this' context for callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, context = null) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    
    const handler = { callback, context };
    this._events.get(event).push(handler);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to event once
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  once(event, callback, context = null) {
    if (!this._onceEvents.has(event)) {
      this._onceEvents.set(event, []);
    }
    this._onceEvents.get(event).push({ callback, context });
  }

  /**
   * Unsubscribe from event
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  off(event, callback) {
    if (this._events.has(event)) {
      const handlers = this._events.get(event);
      const index = handlers.findIndex(h => h.callback === callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this._events.delete(event);
      }
    }
  }

  /**
   * Emit event with data
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    // Regular subscribers
    if (this._events.has(event)) {
      this._events.get(event).forEach(handler => {
        try {
          handler.callback.apply(handler.context, args);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${event}":`, error);
        }
      });
    }
    
    // Once subscribers
    if (this._onceEvents.has(event)) {
      const handlers = this._onceEvents.get(event);
      this._onceEvents.delete(event);
      handlers.forEach(handler => {
        try {
          handler.callback.apply(handler.context, args);
        } catch (error) {
          console.error(`[EventBus] Error in once handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  clear(event) {
    this._events.delete(event);
    this._onceEvents.delete(event);
  }

  /**
   * Remove all listeners
   */
  clearAll() {
    this._events.clear();
    this._onceEvents.clear();
  }

  /**
   * Get listener count for event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return (this._events.get(event)?.length || 0) + 
           (this._onceEvents.get(event)?.length || 0);
  }
}

// Global event bus instance
const EVENTS = new EventBus();

// Event name constants
const EVENT_NAMES = {
  // Tracking
  TRACKING_START: 'tracking:start',
  TRACKING_STOP: 'tracking:stop',
  TRACKING_UPDATE: 'tracking:update',
  GAZE_MOVE: 'gaze:move',
  
  // Calibration
  CALIBRATION_START: 'calibration:start',
  CALIBRATION_COMPLETE: 'calibration:complete',
  CALIBRATION_CANCEL: 'calibration:cancel',
  
  // Mode
  MODE_CHANGE: 'mode:change',
  
  // Screen
  SCREEN_CHANGE: 'screen:change',
  
  // Quiz
  QUIZ_START: 'quiz:start',
  QUIZ_ANSWER: 'quiz:answer',
  QUIZ_COMPLETE: 'quiz:complete',
  QUIZ_HINT: 'quiz:hint',
  
  // Dwell
  DWELL_START: 'dwell:start',
  DWELL_PROGRESS: 'dwell:progress',
  DWELL_SELECT: 'dwell:select',
  DWELL_CANCEL: 'dwell:cancel',
  
  // SOS
  SOS_TRIGGER: 'sos:trigger',
  SOS_CLOSE: 'sos:close',
  
  // Camera
  CAMERA_READY: 'camera:ready',
  CAMERA_ERROR: 'camera:error',
  
  // Voice
  VOICE_START: 'voice:start',
  VOICE_END: 'voice:end'
};