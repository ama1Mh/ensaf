/**
 * Lesson Viewer - Manages educational content display
 */
const LessonViewer = (() => {
  let lessons = [];
  let currentIndex = 0;
  let subjectId = null;

  /**
   * Load lessons for a subject
   * @param {string} subjId - Subject ID
   */
  function load(subjId) {
    subjectId = subjId;
    
    if (typeof DB !== 'undefined') {
      lessons = DB.lessons[subjId] || DB.lessons.math || [];
    } else {
      lessons = [];
    }
    
    currentIndex = 0;
    
    EVENTS.emit('lesson:loaded', {
      subject: subjId,
      count: lessons.length
    });
    
    return getCurrent();
  }

  /**
   * Get current lesson data
   * @returns {Object|null}
   */
  function getCurrent() {
    if (!lessons.length || currentIndex >= lessons.length) return null;
    return {
      ...lessons[currentIndex],
      index: currentIndex,
      total: lessons.length,
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < lessons.length - 1
    };
  }

  /**
   * Go to next lesson
   * @returns {Object|null}
   */
  function next() {
    if (currentIndex < lessons.length - 1) {
      currentIndex++;
      return getCurrent();
    }
    return null;
  }

  /**
   * Go to previous lesson
   * @returns {Object|null}
   */
  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      return getCurrent();
    }
    return null;
  }

  /**
   * Get lesson count
   * @returns {number}
   */
  function count() {
    return lessons.length;
  }

  /**
   * Check if there are more lessons
   * @returns {boolean}
   */
  function hasMore() {
    return currentIndex < lessons.length - 1;
  }

  /**
   * Get progress percentage
   * @returns {number}
   */
  function getProgress() {
    if (!lessons.length) return 0;
    return Math.round(((currentIndex + 1) / lessons.length) * 100);
  }

  /**
   * Format lesson content (clean HTML)
   * @param {string} body - Raw lesson body
   * @returns {string} Formatted HTML
   */
  function formatContent(body) {
    return body
      .replace(/<span class="lhl">/g, '<mark class="highlight">')
      .replace(/<\/span>/g, '</mark>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Get all lessons for current subject
   * @returns {Array}
   */
  function getAll() {
    return lessons;
  }

  /**
   * Reset viewer state
   */
  function reset() {
    lessons = [];
    currentIndex = 0;
    subjectId = null;
  }

  return {
    load,
    getCurrent,
    next,
    prev,
    count,
    hasMore,
    getProgress,
    formatContent,
    getAll,
    reset
  };
})();