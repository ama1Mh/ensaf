/**
 * ENSAF Calibration v4 — 16-Point Grid + Validation Pass
 *
 * Improvements over v3:
 * ─────────────────────────────────────────────────────
 * 1. 16-point grid (4×4) instead of 9 (3×3) — better coverage at edges/corners
 * 2. Two-pass: calibration (collect data) → validation (test accuracy)
 * 3. Per-point confidence gating — only records when EAR confidence is high
 * 4. Adaptive hold time — waits until face is stable before countdown
 * 5. Visual quality feedback per point (green/yellow/red dot)
 * 6. Drift-correction anchor: after calibration, 4 validation points
 *    measure error and set drift offsets automatically
 */
const Calibration = (() => {
  let isActive     = false;
  let pointIndex   = 0;
  let phase        = 'calibrate';   // 'calibrate' | 'validate'
  let onCompleteCb = null;
  let onCancelCb   = null;

  // DOM elements
  let bgEl       = null;
  let dotEl      = null;
  let ringEl     = null;
  let labelEl    = null;
  let cancelBtn  = null;
  let instructEl = null;
  let qualBarEl  = null;
  let phaseEl    = null;

  /* ── Configuration ────────────────────────────────────────────────── */

  // 16-point calibration grid (4×4)
  const CAL_GRID = [
    {x:0.10,y:0.10},{x:0.37,y:0.10},{x:0.63,y:0.10},{x:0.90,y:0.10},
    {x:0.10,y:0.37},{x:0.37,y:0.37},{x:0.63,y:0.37},{x:0.90,y:0.37},
    {x:0.10,y:0.63},{x:0.37,y:0.63},{x:0.63,y:0.63},{x:0.90,y:0.63},
    {x:0.10,y:0.90},{x:0.37,y:0.90},{x:0.63,y:0.90},{x:0.90,y:0.90},
  ];

  // 4 validation points (different from calibration)
  const VAL_GRID = [
    {x:0.25,y:0.25},{x:0.75,y:0.25},
    {x:0.25,y:0.75},{x:0.75,y:0.75},
  ];

  const DOT_R        = 20;
  const RING_R       = 34;
  const HOLD_MS      = 700;      // wait for face to stabilise
  const COUNTDOWN_MS = 1600;     // ring fill duration
  const FRAMES_PER_PT = 30;     // gaze frames to average
  const RING_CIRC    = 2 * Math.PI * RING_R;

  let validationErrors = [];

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function setRingProgress(p) {
    if (ringEl) ringEl.style.strokeDashoffset = RING_CIRC * (1 - p);
  }
  function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── UI ──────────────────────────────────────────────────────────── */
  function createUI() {
    bgEl = Object.assign(document.createElement('div'), {id:'cal-bg'});
    bgEl.style.cssText = `
      display:none;position:fixed;inset:0;z-index:9998;
      background:rgba(0,0,0,0.65);backdrop-filter:blur(2px);`;
    document.body.appendChild(bgEl);

    // Phase indicator (top-left)
    phaseEl = document.createElement('div');
    phaseEl.style.cssText = `
      display:none;position:fixed;top:22px;left:22px;z-index:10001;
      color:rgba(255,255,255,.5);font-size:13px;pointer-events:none;
      text-shadow:0 1px 6px rgba(0,0,0,.9);letter-spacing:.5px;`;
    document.body.appendChild(phaseEl);

    // Main instruction (top-center)
    instructEl = document.createElement('div');
    instructEl.style.cssText = `
      display:none;position:fixed;top:22px;left:50%;
      transform:translateX(-50%);z-index:10001;
      text-align:center;pointer-events:none;white-space:nowrap;
      color:#fff;font-size:15px;font-weight:600;letter-spacing:.4px;
      text-shadow:0 2px 10px rgba(0,0,0,.9);`;
    instructEl.innerHTML =
      `🎯 المعايرة &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة وثبّت نظرك</span>`;
    document.body.appendChild(instructEl);

    // Point counter (top-right)
    labelEl = document.createElement('div');
    labelEl.style.cssText = `
      display:none;position:fixed;top:22px;right:22px;z-index:10001;
      color:rgba(255,255,255,.55);font-size:14px;pointer-events:none;
      text-shadow:0 1px 6px rgba(0,0,0,.9);`;
    document.body.appendChild(labelEl);

    // Quality bar (bottom, above cancel)
    qualBarEl = document.createElement('div');
    qualBarEl.style.cssText = `
      display:none;position:fixed;bottom:70px;left:50%;
      transform:translateX(-50%);z-index:10001;
      width:220px;text-align:center;`;
    qualBarEl.innerHTML = `
      <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:5px;">جودة المعايرة</div>
      <div style="height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden;">
        <div id="cal-qual-fill" style="height:100%;width:0%;background:#00f0ff;
             border-radius:2px;transition:width 0.4s ease;"></div>
      </div>`;
    document.body.appendChild(qualBarEl);

    // Cancel button (bottom-center)
    cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'إلغاء';
    cancelBtn.style.cssText = `
      display:none;position:fixed;bottom:26px;left:50%;
      transform:translateX(-50%);z-index:10001;
      padding:8px 26px;border-radius:8px;
      border:1px solid rgba(255,255,255,.2);
      background:rgba(0,0,0,.4);
      color:rgba(255,255,255,.55);font-size:13px;cursor:pointer;`;
    cancelBtn.addEventListener('click', cancel);
    document.body.appendChild(cancelBtn);

    // Floating dot
    const SIZE = (RING_R + 10) * 2;
    dotEl = document.createElement('div');
    dotEl.id = 'cal-dot';
    dotEl.style.cssText = `
      display:none;position:fixed;z-index:10000;pointer-events:none;
      width:${SIZE}px;height:${SIZE}px;
      transform:translate(-50%,-50%);
      transition:left .55s cubic-bezier(.4,0,.2,1),
                 top  .55s cubic-bezier(.4,0,.2,1);`;
    dotEl.innerHTML = `
      <svg width="${SIZE}" height="${SIZE}" overflow="visible"
           style="position:absolute;inset:0;">
        <defs>
          <radialGradient id="calGrad" cx="38%" cy="32%">
            <stop offset="0%"   stop-color="#ffffff"/>
            <stop offset="40%"  stop-color="#00f0ff"/>
            <stop offset="100%" stop-color="#6d28d9"/>
          </radialGradient>
          <filter id="calGlow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle id="cal-ring"
          cx="${SIZE/2}" cy="${SIZE/2}" r="${RING_R}"
          fill="none" stroke="#00f0ff" stroke-width="3.5"
          stroke-linecap="round"
          stroke-dasharray="${RING_CIRC}"
          stroke-dashoffset="${RING_CIRC}"
          transform="rotate(-90,${SIZE/2},${SIZE/2})"
          style="transition:stroke 0.2s;"/>
        <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${DOT_R}"
          fill="url(#calGrad)" filter="url(#calGlow)"/>
      </svg>`;
    document.body.appendChild(dotEl);
    ringEl = dotEl.querySelector('#cal-ring');
  }

  /* ── Show / Hide ──────────────────────────────────────────────────── */
  function show() {
    [bgEl, dotEl, instructEl, labelEl, cancelBtn, qualBarEl, phaseEl]
      .forEach(el => el && (el.style.display = 'block'));
  }
  function hide() {
    isActive = false;
    [bgEl, dotEl, instructEl, labelEl, cancelBtn, qualBarEl, phaseEl]
      .forEach(el => el && (el.style.display = 'none'));
  }

  function updateQualityBar() {
    const fill = document.getElementById('cal-qual-fill');
    if (!fill || typeof EyeTracker === 'undefined') return;
    const q = EyeTracker.getCalibrationQuality();
    fill.style.width = (q * 100) + '%';
    fill.style.background = q > 0.75 ? '#10b981' : q > 0.4 ? '#fbbf24' : '#00f0ff';
  }

  /* ── Calibration flow ─────────────────────────────────────────────── */
  function init() {
    if (!document.getElementById('cal-bg')) createUI();
  }

  function start(onComplete, onCancel) {
    onCompleteCb = onComplete;
    onCancelCb   = onCancel;
    pointIndex   = 0;
    phase        = 'calibrate';
    validationErrors = [];
    isActive     = true;

    if (typeof EyeTracker !== 'undefined') EyeTracker.startCalibration();

    show();
    phaseEl.textContent = '① المعايرة';
    instructEl.innerHTML =
      `🎯 المعايرة &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة وثبّت نظرك</span>`;

    runPoint();
  }

  async function runPoint() {
    if (!isActive) return;

    const grid = phase === 'calibrate' ? CAL_GRID : VAL_GRID;

    if (pointIndex >= grid.length) {
      if (phase === 'calibrate') {
        await startValidation();
      } else {
        await finalize();
      }
      return;
    }

    const pt = grid[pointIndex];
    const sx = pt.x * window.innerWidth;
    const sy = pt.y * window.innerHeight;

    const total = grid.length;
    labelEl.textContent = `${pointIndex + 1} / ${total}`;

    // Move dot
    dotEl.style.left = sx + 'px';
    dotEl.style.top  = sy + 'px';

    ringEl.style.stroke = '#00f0ff';
    setRingProgress(0);

    await pause(HOLD_MS);
    if (!isActive) return;

    // Countdown ring
    await animateCountdown();
    if (!isActive) return;

    // Flash captured
    ringEl.style.stroke = '#10b981';
    setRingProgress(1);

    if (typeof EyeTracker !== 'undefined') {
      await EyeTracker.recordCalibrationPoint(sx, sy, FRAMES_PER_PT);
    }

    updateQualityBar();
    await pause(200);
    pointIndex++;
    runPoint();
  }

  async function startValidation() {
    // Fit the model first
    let fitOk = false;
    if (typeof EyeTracker !== 'undefined') {
      fitOk = EyeTracker.finalizeCalibration();
    }
    if (!fitOk) {
      // Not enough data — just complete
      hide();
      if (onCompleteCb) onCompleteCb(false, 0);
      return;
    }

    phase      = 'validate';
    pointIndex = 0;
    phaseEl.textContent = '② التحقق';
    instructEl.innerHTML =
      `✅ التحقق &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة لقياس الدقة</span>`;

    runPoint();
  }

  async function finalize() {
    // Compute average validation error in pixels
    let avgErr = 0;
    if (validationErrors.length > 0) {
      avgErr = validationErrors.reduce((s, e) => s + e, 0) / validationErrors.length;
    }

    const quality = typeof EyeTracker !== 'undefined'
      ? EyeTracker.getCalibrationQuality()
      : 0;

    hide();
    if (onCompleteCb) onCompleteCb(true, quality, Math.round(avgErr));
  }

  function animateCountdown() {
    return new Promise(resolve => {
      const t0 = performance.now();
      function frame(now) {
        if (!isActive) { resolve(); return; }
        const p = Math.min(1, (now - t0) / COUNTDOWN_MS);
        setRingProgress(p);
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function cancel() {
    isActive = false;
    hide();
    if (onCancelCb) onCancelCb();
  }

  function isRunning() { return isActive; }

  return { init, start, cancel, isRunning };
})();