#!/usr/bin/env node
/**
 * Reproducible before/after accuracy benchmark (simulated head-tracking input).
 *   npm run bench      (or: node tests/bench/accuracy-sim.js)
 * Prints Markdown tables used in CHANGES.md.
 */
const S = require('../../js/core/pointer-sim.js');

const seeds = [1, 2, 3, 4, 5];
const scenarios = {
  'Large targets 180×110 px, typical noise': { grid: {}, noise: {} },
  'Small targets 120×80 px, strong tremor': {
    grid: { cols: 6, rows: 4, tw: 120, th: 80, gap: 16 },
    noise: { white: 20, tremorAmp: 16, glitchRate: 0.04, aimSigma: 22 }
  }
};

function agg(pipeline, sc) {
  const rs = seeds.map(seed => S.runSimulation({ pipeline, seed, trials: 40, dwellMs: 2000, ...sc }));
  const sum = k => rs.reduce((a, r) => a + r[k], 0);
  const trials = sum('trials');
  return {
    hitRate: (100 * sum('hits') / trials).toFixed(1) + '%',
    falseSel: sum('falseSelections'),
    timeouts: sum('timeouts'),
    meanTime: (sum('meanTimeMs') / rs.length / 1000).toFixed(2) + ' s',
    trials
  };
}

console.log('Dwell time 2.0 s, 5 seeds × 40 trials per row.\n');
console.log('| Scenario | Pipeline | Hit rate | False selections | Timeouts | Mean time to select |');
console.log('|---|---|---|---|---|---|');
for (const [name, sc] of Object.entries(scenarios)) {
  for (const p of ['legacy', 'new']) {
    const a = agg(p, sc);
    console.log(`| ${name} | ${p === 'legacy' ? 'Before (EMA + old dwell)' : 'After (One Euro + new dwell)'} | ${a.hitRate} | ${a.falseSel} / ${a.trials} | ${a.timeouts} | ${a.meanTime} |`);
  }
}
console.log('');
console.log('| Pipeline | Rest jitter (RMS px) | Frames where the cursor moves while holding still | Lag to 90 % of a 400 px move |');
console.log('|---|---|---|---|');
for (const p of ['legacy', 'new']) {
  const j = S.measureRestJitter({ pipeline: p });
  const l = S.measureStepLag({ pipeline: p });
  console.log(`| ${p === 'legacy' ? 'Before' : 'After'} | ${j.rmsPx} | ${j.movingFramesPct}% | ${l.lag90Ms} ms |`);
}
