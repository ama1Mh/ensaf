/**
 * Session report calculation (pure logic).
 * Turns raw quiz counters into the numbers and grade shown on the result
 * screen and spoken by the voice.
 */
(function (root) {
  'use strict';

  /**
   * @param {object} o
   * @param {number} o.score       correct answers
   * @param {number} o.total       questions asked
   * @param {number} o.durationMs  quiz duration
   * @param {number} o.hints       hints shown (hesitations)
   * @returns {{score,total,percent,durationSec,avgSec,hints,grade,icon,passed}}
   */
  function computeReport({ score = 0, total = 0, durationMs = 0, hints = 0 } = {}) {
    const safeTotal = Math.max(0, total | 0);
    const safeScore = Math.min(Math.max(0, score | 0), safeTotal);
    const percent = safeTotal ? Math.round((safeScore / safeTotal) * 100) : 0;
    const durationSec = Math.max(0, Math.round(durationMs / 1000));
    const avgSec = safeTotal ? Math.round(durationSec / safeTotal) : 0;

    let grade, icon;
    if (percent >= 90) { grade = 'excellent'; icon = 'emoji_events'; }
    else if (percent >= 70) { grade = 'good'; icon = 'star'; }
    else if (percent >= 50) { grade = 'fair'; icon = 'thumb_up'; }
    else { grade = 'retry'; icon = 'fitness_center'; }

    return {
      score: safeScore,
      total: safeTotal,
      percent,
      durationSec,
      avgSec,
      hints: Math.max(0, hints | 0),
      grade,
      icon,
      passed: percent >= 70
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { computeReport };
  else root.computeReport = computeReport;
})(typeof window !== 'undefined' ? window : globalThis);
