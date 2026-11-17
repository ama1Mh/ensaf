const test = require('node:test');
const assert = require('node:assert/strict');
const { OneEuroFilter, PointFilter, LegacyEmaFilter } = require('../../js/core/filters.js');
const { mulberry32, gaussian } = require('../../js/core/pointer-sim.js');

test('OneEuroFilter returns the first sample unchanged', () => {
  const f = new OneEuroFilter();
  assert.equal(f.filter(42, 0), 42);
});

test('OneEuroFilter converges to a constant input', () => {
  const f = new OneEuroFilter({ minCutoff: 1, beta: 0.01 });
  f.filter(0, 0);
  let y = 0;
  for (let t = 33; t < 3000; t += 33) y = f.filter(100, t);
  assert.ok(Math.abs(y - 100) < 0.5, `got ${y}`);
});

test('OneEuroFilter reduces jitter of a noisy still signal', () => {
  const rand = mulberry32(3);
  const f = new OneEuroFilter({ minCutoff: 0.5, beta: 0.002 });
  let rawVar = 0, outVar = 0, n = 0;
  for (let t = 0; t < 10000; t += 33) {
    const raw = 500 + gaussian(rand) * 15;
    const out = f.filter(raw, t);
    if (t > 1000) { rawVar += (raw - 500) ** 2; outVar += (out - 500) ** 2; n++; }
  }
  assert.ok(Math.sqrt(outVar / n) < Math.sqrt(rawVar / n) / 2, 'output jitter should be < half of input jitter');
});

test('OneEuroFilter lags less than the legacy EMA on a fast move', () => {
  const fast = new OneEuroFilter({ minCutoff: 0.4, beta: 0.002 });
  const ema = new LegacyEmaFilter(0.1);
  let t = 0;
  for (; t < 500; t += 33) { fast.filter(0, t); ema.filter(0, 0); }
  let a, b;
  for (let i = 0; i < 9; i++, t += 33) { a = fast.filter(400, t); b = ema.filter(400, 0).x; }
  assert.ok(a > b, `one euro ${a} should be ahead of ema ${b}`);
});

test('OneEuroFilter survives duplicate timestamps', () => {
  const f = new OneEuroFilter();
  f.filter(1, 100);
  assert.ok(Number.isFinite(f.filter(2, 100)));
});

test('PointFilter dead zone keeps the cursor perfectly still for tiny moves', () => {
  const f = new PointFilter({ minCutoff: 1, beta: 0, deadZone: 5 });
  const first = f.filter(100, 100, 0);
  const second = f.filter(102, 101, 33);
  assert.deepEqual(second, first);
});

test('PointFilter follows moves larger than the dead zone', () => {
  const f = new PointFilter({ minCutoff: 1, beta: 0.01, deadZone: 5 });
  f.filter(100, 100, 0);
  let p;
  for (let t = 33; t < 2000; t += 33) p = f.filter(300, 100, t);
  assert.ok(p.x > 290);
});

test('PointFilter.configure and reset', () => {
  const f = new PointFilter();
  f.configure({ minCutoff: 0.2, deadZone: 2 });
  assert.equal(f.fx.minCutoff, 0.2);
  assert.equal(f.deadZone, 2);
  f.filter(1, 1, 0);
  f.reset();
  assert.equal(f.out, null);
});
