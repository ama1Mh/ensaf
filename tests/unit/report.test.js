const test = require('node:test');
const assert = require('node:assert/strict');
const { computeReport } = require('../../js/core/report.js');

test('percent, average time and grade', () => {
  const r = computeReport({ score: 4, total: 5, durationMs: 50000, hints: 2 });
  assert.equal(r.percent, 80);
  assert.equal(r.durationSec, 50);
  assert.equal(r.avgSec, 10);
  assert.equal(r.hints, 2);
  assert.equal(r.grade, 'good');
  assert.equal(r.passed, true);
});

test('grade boundaries', () => {
  const g = s => computeReport({ score: s, total: 10 }).grade;
  assert.equal(g(10), 'excellent');
  assert.equal(g(9), 'excellent');
  assert.equal(g(7), 'good');
  assert.equal(g(5), 'fair');
  assert.equal(g(4), 'retry');
  assert.equal(computeReport({ score: 6, total: 10 }).passed, false);
});

test('safe with zero questions and bad input', () => {
  const r = computeReport({ score: 3, total: 0, durationMs: -5 });
  assert.equal(r.percent, 0);
  assert.equal(r.avgSec, 0);
  assert.equal(r.durationSec, 0);
  assert.equal(r.score, 0, 'score clamped to total');
  assert.equal(computeReport().total, 0);
});

test('rounding', () => {
  assert.equal(computeReport({ score: 1, total: 3 }).percent, 33);
  assert.equal(computeReport({ score: 2, total: 3 }).percent, 67);
});
