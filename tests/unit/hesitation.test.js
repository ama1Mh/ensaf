const test = require('node:test');
const assert = require('node:assert/strict');
const { HesitationTimer } = require('../../js/core/hesitation.js');

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimer: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; },
    clearTimer: i => timers.delete(i),
    advance(ms) {
      now += ms;
      for (const [i, t] of [...timers]) if (t.at <= now) { timers.delete(i); t.fn(); }
    }
  };
}

test('fires once after 6 s without an answer', () => {
  const c = fakeClock(); let n = 0;
  const h = new HesitationTimer({ timeoutMs: 6000, onHesitate: () => n++, ...c });
  h.start();
  c.advance(5999); assert.equal(n, 0);
  c.advance(1); assert.equal(n, 1);
  c.advance(60000); assert.equal(n, 1);
  assert.equal(h.fired, true);
});

test('stop() (answer given) prevents the hint', () => {
  const c = fakeClock(); let n = 0;
  const h = new HesitationTimer({ timeoutMs: 6000, onHesitate: () => n++, ...c });
  h.start(); c.advance(3000); h.stop(); c.advance(10000);
  assert.equal(n, 0);
});

test('pause/resume keeps the remaining time (SOS or settings open)', () => {
  const c = fakeClock(); let n = 0;
  const h = new HesitationTimer({ timeoutMs: 6000, onHesitate: () => n++, ...c });
  h.start(); c.advance(4000); h.pause();
  c.advance(30000); assert.equal(n, 0);
  h.resume(); c.advance(1999); assert.equal(n, 0);
  c.advance(1); assert.equal(n, 1);
});

test('start() restarts for a new question', () => {
  const c = fakeClock(); let n = 0;
  const h = new HesitationTimer({ timeoutMs: 6000, onHesitate: () => n++, ...c });
  h.start(); c.advance(6000); assert.equal(n, 1);
  h.start(); c.advance(6000); assert.equal(n, 2);
});

test('resume after firing does nothing', () => {
  const c = fakeClock(); let n = 0;
  const h = new HesitationTimer({ timeoutMs: 100, onHesitate: () => n++, ...c });
  h.start(); c.advance(100); h.resume(); c.advance(1000);
  assert.equal(n, 1);
});
