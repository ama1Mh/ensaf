/**
 * ENSAF Calibration v3
 *
 * Full-screen transparent calibration — no dark panel blocking the screen.
 * The dot moves to the ACTUAL screen position the user must look at.
 * A shrinking ring shows countdown progress before each sample is captured.
 */
const Calibration = (() => {
  let isActive     = false;
  let pointIndex   = 0;
  let onCompleteCb = null;
  let onCancelCb   = null;

  /* DOM elements created once */
  let bgEl       = null;   // full-screen semi-transparent backdrop
  let dotEl      = null;   // the target dot + SVG ring
  let ringEl     = null;   // the SVG <circle> countdown ring
  let labelEl    = null;   // "2 / 9" counter
  let cancelBtn  = null;
  let instructEl = null;

  /* ── Config ─────────────────────────────────────────────────────────── */
  const GRID = [
    {x:0.15,y:0.15},{x:0.50,y:0.15},{x:0.85,y:0.15},
    {x:0.15,y:0.50},{x:0.50,y:0.50},{x:0.85,y:0.50},
    {x:0.15,y:0.85},{x:0.50,y:0.85},{x:0.85,y:0.85},
  ];

  const DOT_R        = 22;    // dot radius px
  const RING_R       = 36;    // countdown ring radius px
  const HOLD_MS      = 600;   // wait after dot arrives before counting down
  const COUNTDOWN_MS = 1800;  // countdown ring animation duration
  const FRAMES_PER_PT = 30;   // gaze frames to average per point

  const RING_CIRC = 2 * Math.PI * RING_R;

  /* ── Helpers ────────────────────────────────────────────────────────── */
  function setRingProgress(progress) {
    // 0 = no ring, 1 = full ring shown
    if (ringEl) ringEl.style.strokeDashoffset = RING_CIRC * (1 - progress);
  }

  function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ── UI creation ────────────────────────────────────────────────────── */
  function createUI() {
    /* Semi-transparent backdrop — covers screen but doesn't CENTER anything */
    bgEl = document.createElement('div');
    bgEl.id = 'cal-bg';
    bgEl.style.cssText = `
      display:none;position:fixed;inset:0;z-index:9998;
      background:rgba(0,0,0,0.6);
    `;
    document.body.appendChild(bgEl);

    /* Instruction bar at top */
    instructEl = document.createElement('div');
    instructEl.style.cssText = `
      display:none;position:fixed;top:22px;left:50%;
      transform:translateX(-50%);z-index:10001;
      text-align:center;pointer-events:none;white-space:nowrap;
      color:#fff;font-size:15px;font-weight:600;letter-spacing:.4px;
      text-shadow:0 2px 10px rgba(0,0,0,.9);
    `;
    instructEl.innerHTML =
      `🎯 معايرة تتبع العين &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة وثبّت نظرك</span>`;
    document.body.appendChild(instructEl);

    /* Point counter — top right */
    labelEl = document.createElement('div');
    labelEl.style.cssText = `
      display:none;position:fixed;top:22px;right:22px;z-index:10001;
      color:rgba(255,255,255,.55);font-size:14px;pointer-events:none;
      text-shadow:0 1px 6px rgba(0,0,0,.9);
    `;
    document.body.appendChild(labelEl);

    /* Cancel button — bottom center */
    cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'إلغاء المعايرة';
    cancelBtn.style.cssText = `
      display:none;position:fixed;bottom:26px;left:50%;
      transform:translateX(-50%);z-index:10001;
      padding:8px 26px;border-radius:8px;
      border:1px solid rgba(255,255,255,.22);
      background:rgba(0,0,0,.45);
      color:rgba(255,255,255,.6);font-size:13px;cursor:pointer;
    `;
    cancelBtn.addEventListener('click', cancel);
    document.body.appendChild(cancelBtn);

    /* Floating target dot — positioned via left/top at real screen coords */
    const SIZE = (RING_R + 8) * 2;
    dotEl = document.createElement('div');
    dotEl.id = 'cal-dot';
    dotEl.style.cssText = `
      display:none;position:fixed;z-index:10000;pointer-events:none;
      width:${SIZE}px;height:${SIZE}px;
      transform:translate(-50%,-50%);
      transition:left .5s cubic-bezier(.4,0,.2,1),
                 top  .5s cubic-bezier(.4,0,.2,1);
    `;

    dotEl.innerHTML = `
      <svg width="${SIZE}" height="${SIZE}" overflow="visible"
           style="position:absolute;inset:0;">
        <defs>
          <radialGradient id="calDotGrad" cx="38%" cy="32%">
            <stop offset="0%"   stop-color="#ffffff"/>
            <stop offset="40%"  stop-color="#00f0ff"/>
            <stop offset="100%" stop-color="#6d28d9"/>
          </radialGradient>
          <filter id="calDotGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Countdown ring — drawn clockwise from 12 o'clock -->
        <circle id="cal-ring"
          cx="${SIZE/2}" cy="${SIZE/2}" r="${RING_R}"
          fill="none" stroke="#00f0ff" stroke-width="3.5"
          stroke-linecap="round"
          stroke-dasharray="${RING_CIRC}"
          stroke-dashoffset="${RING_CIRC}"
          transform="rotate(-90,${SIZE/2},${SIZE/2})"
          style="transition:stroke 0.2s;"/>
        <!-- Dot -->
        <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${DOT_R}"
          fill="url(#calDotGrad)" filter="url(#calDotGlow)"/>
      </svg>
    `;
    document.body.appendChild(dotEl);
    ringEl = dotEl.querySelector('#cal-ring');
  }

  /* ── Public API ─────────────────────────────────────────────────────── */
  function init() {
    if (!document.getElementById('cal-bg')) createUI();
  }

  function start(onComplete, onCancel) {
    onCompleteCb = onComplete;
    onCancelCb   = onCancel;
    pointIndex   = 0;
    isActive     = true;

    bgEl.style.display       = 'block';
    dotEl.style.display      = 'block';
    instructEl.style.display = 'block';
    labelEl.style.display    = 'block';
    cancelBtn.style.display  = 'block';

    if (typeof EyeTracker !== 'undefined') EyeTracker.startCalibration();

    runPoint();
  }

  async function runPoint() {
    if (!isActive) return;
    if (pointIndex >= GRID.length) { await finalize(); return; }

    const pt = GRID[pointIndex];
    // Use actual screen pixel positions — this IS where the user must look
    const sx = pt.x * window.innerWidth;
    const sy = pt.y * window.innerHeight;

    labelEl.textContent = `${pointIndex + 1} / ${GRID.length}`;

    /* Move dot to real screen position */
    dotEl.style.left = sx + 'px';
    dotEl.style.top  = sy + 'px';

    /* Reset ring to empty */
    ringEl.style.stroke = '#00f0ff';
    setRingProgress(0);

    /* Let the dot finish moving and let user fixate */
    await pause(HOLD_MS);
    if (!isActive) return;

    /* Animate the countdown ring filling up */
    await animateCountdown();
    if (!isActive) return;

    /* Flash green = captured */
    ringEl.style.stroke = '#10b981';
    setRingProgress(1);

    /* Collect gaze frames */
    if (typeof EyeTracker !== 'undefined') {
      await EyeTracker.recordCalibrationPoint(sx, sy, FRAMES_PER_PT);
    }

    await pause(250);
    pointIndex++;
    runPoint();
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

  async function finalize() {
    let success = false, quality = 0;
    if (typeof EyeTracker !== 'undefined') {
      success = EyeTracker.finalizeCalibration();
      quality = EyeTracker.getCalibrationQuality();
    }
    hide();
    if (onCompleteCb) onCompleteCb(success, quality);
  }

  function cancel() {
    isActive = false;
    hide();
    if (onCancelCb) onCancelCb();
  }

  function hide() {
    isActive = false;
    [bgEl, dotEl, instructEl, labelEl, cancelBtn].forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  function isRunning() { return isActive; }

  return { init, start, cancel, isRunning };
})();