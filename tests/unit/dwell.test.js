const test = require('node:test');
const assert = require('node:assert/strict');
const { DwellCore } = require('../../js/core/dwell-core.js');
const { pickTargetSticky, pickTargetLegacy, makeGrid } = require('../../js/core/pointer-sim.js');

function hold(core, id, from, to, step = 33, x = 0, y = 0) {
  let last;
  for (let t = from; t <= to; t += step) last = core.update(id, x, y, t);
  return last;
}

test('selects after the dwell time', () => {
  const c = new DwellCore({ dwellMs: 1000 });
  assert.equal(c.update('a', 0, 0, 0).progress, 0);
  const mid = c.update('a', 0, 0, 500);
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-9);
  assert.equal(mid.selected, null);
  assert.equal(c.update('a', 0, 0, 1000).selected, 'a');
});

test('leaving the element cancels the dwell', () => {
  const c = new DwellCore({ dwellMs: 1000 });
  c.update('a', 0, 0, 0);
  c.update('a', 0, 0, 800);
  assert.equal(c.update(null, 0, 0, 850).progress, 0);
  assert.equal(c.update('a', 0, 0, 900).progress, 0, 'timer restarts from zero');
  assert.equal(c.update('a', 0, 0, 1700).selected, null);
});

test('moving to another element restarts the timer for that element', () => {
  const c = new DwellCore({ dwellMs: 1000 });
  c.update('a', 0, 0, 0);
  c.update('a', 0, 0, 900);
  assert.equal(c.update('b', 0, 0, 950).progress, 0);
  assert.equal(c.update('b', 0, 0, 1949).selected, null);
  assert.equal(c.update('b', 0, 0, 1950).selected, 'b');
});

test('no double selection: must move away before selecting again (re-arm)', () => {
  const c = new DwellCore({ dwellMs: 1000, cooldownMs: 500, rearmDistance: 40 });
  assert.equal(hold(c, 'a', 0, 1000, 50, 100, 100).selected, 'a');
  const r = hold(c, 'a', 1050, 5000, 50, 100, 100);
  assert.equal(r.selected, null);
  assert.equal(r.blocked, true);
});

test('cooldown blocks selection right after a selection even after moving', () => {
  const c = new DwellCore({ dwellMs: 300, cooldownMs: 900, rearmDistance: 40 });
  hold(c, 'a', 0, 300, 50, 0, 0);
  assert.equal(c.update('b', 200, 200, 400).blocked, true);
  assert.equal(c.update('b', 200, 200, 1300).blocked, false);
});

test('re-arms after moving away and selects again', () => {
  const c = new DwellCore({ dwellMs: 500, cooldownMs: 200, rearmDistance: 40 });
  hold(c, 'a', 0, 500, 50, 0, 0);
  c.update('a', 100, 0, 800);
  assert.equal(hold(c, 'a', 850, 1300, 50, 100, 0).selected, 'a');
});

test('grace period tolerates a short dropout (blink / tracking glitch)', () => {
  const c = new DwellCore({ dwellMs: 1000, graceMs: 150 });
  c.update('a', 0, 0, 0);
  c.update('a', 0, 0, 500);
  assert.equal(c.update(null, 0, 0, 600).target, 'a');
  c.update('a', 0, 0, 700);
  // 600 ms before the dropout + 400 ms after = 1000 ms on target; the 100 ms away is not counted.
  assert.equal(c.update('a', 0, 0, 1050).selected, null, 'time away is not counted');
  assert.equal(c.update('a', 0, 0, 1100).selected, 'a');
});

test('long dropout beyond grace cancels', () => {
  const c = new DwellCore({ dwellMs: 1000, graceMs: 150 });
  c.update('a', 0, 0, 0);
  c.update(null, 0, 0, 500);
  const r = c.update(null, 0, 0, 700);
  assert.equal(r.target, null);
  assert.equal(r.progress, 0);
});

test('disarm() (screen change) prevents auto-selecting a new button under a resting cursor', () => {
  const c = new DwellCore({ dwellMs: 500, cooldownMs: 300, rearmDistance: 40 });
  c.disarm(50, 50, 0);
  assert.equal(hold(c, 'newButton', 0, 3000, 50, 50, 50).selected, null);
});

test('setDwellTime changes the threshold', () => {
  const c = new DwellCore({ dwellMs: 3000 });
  c.setDwellTime(1000);
  c.update('a', 0, 0, 0);
  assert.equal(c.update('a', 0, 0, 1000).selected, 'a');
});

test('sticky hit test keeps the target near its edge; legacy picks the first padded rect', () => {
  const rects = makeGrid({ width: 1000, height: 600, cols: 2, rows: 1, tw: 200, th: 100, gap: 20 });
  const [a, b] = rects;
  const y = (a.top + a.bottom) / 2;
  assert.equal(pickTargetSticky(a.right + 5, y, rects, a.id), a.id);
  assert.equal(pickTargetSticky(a.right + 5, y, rects, null), null);
  // Inside B but within 30px of A: the legacy hit test wrongly returns A.
  assert.equal(pickTargetLegacy(b.left + 5, y, rects), a.id);
  assert.equal(pickTargetSticky(b.left + 5, y, rects, null), b.id);
});

test('moving away and back during the cooldown still re-arms (no stuck state)', () => {
  const c = new DwellCore({ dwellMs: 500, cooldownMs: 900, rearmDistance: 40 });
  hold(c, 'a', 0, 500, 50, 0, 0);            // selected at 500, cooldown until 1400
  c.update(null, 100, 100, 600);             // quickly away…
  let selected = null;                       // …and straight back, still in cooldown
  for (let t = 700; t <= 2200 && !selected; t += 50) selected = c.update('b', 0, 0, t).selected;
  assert.equal(selected, 'b');
});
