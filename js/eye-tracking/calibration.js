/**
 * ENSAF Calibration v2
 *
 * Drives the EyeTracker.recordCalibrationPoint() API.
 * Shows a visual dot grid, waits for the user to fixate each dot,
 * collects frames, fits the model, and reports quality.
 *
 * Usage:
 *   Calibration.init();
 *   Calibration.start(onComplete, onCancel);
 */
const Calibration = (() => {
  let isActive       = false;
  let pointIndex     = 0;
  let onCompleteCb   = null;
  let onCancelCb     = null;
  let overlay        = null;
  let statusEl       = null;
  let progressFillEl = null;
  let pointsEl       = null;
  let dotEl          = null;   // animated floating dot

  /* 9-point grid (fractional screen coords) */
  const GRID = [
    {x:0.15,y:0.15},{x:0.50,y:0.15},{x:0.85,y:0.15},
    {x:0.15,y:0.50},{x:0.50,y:0.50},{x:0.85,y:0.50},
    {x:0.15,y:0.85},{x:0.50,y:0.85},{x:0.85,y:0.85},
  ];

  /* Frames to collect per calibration point */
  const FRAMES_PER_POINT = 25;

  /* Hold time (ms) that user must fixate before capture starts */
  const HOLD_MS = 900;

  /* ─── UI creation ────────────────────────────────────────────────────── */
  function createUI() {
    overlay = document.createElement('div');
    overlay.id = 'calibration-overlay';
    overlay.style.cssText = `
      display:none;
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.92);
      flex-direction:column;align-items:center;justify-content:center;
    `;

    overlay.innerHTML = `
      <div style="text-align:center;color:#fff;margin-bottom:28px;">
        <div style="font-size:22px;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
          🎯 معايرة تتبع العين
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,.55);">
          انظر إلى كل نقطة وثبّت نظرك حتى تكتمل الدائرة
        </div>
      </div>

      <div id="cal-grid" style="
        display:grid;grid-template-columns:repeat(3,1fr);
        gap:56px;width:min(70vw,420px);margin-bottom:28px;">
      </div>

      <div id="cal-status" style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:10px;">
        0 / 9 نقاط
      </div>

      <div style="width:200px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden;margin-bottom:20px;">
        <div id="cal-prog" style="
          height:100%;width:0%;transition:width .35s;
          background:linear-gradient(90deg,#00f0ff,#8b5cf6);"></div>
      </div>

      <button id="cal-cancel" style="
        padding:8px 24px;border-radius:8px;border:1px solid rgba(255,255,255,.25);
        background:transparent;color:rgba(255,255,255,.6);
        font-size:13px;cursor:pointer;transition:all .2s;">
        إلغاء
      </button>
    `;

    document.body.appendChild(overlay);
    statusEl       = overlay.querySelector('#cal-status');
    progressFillEl = overlay.querySelector('#cal-prog');
    pointsEl       = overlay.querySelector('#cal-grid');

    overlay.querySelector('#cal-cancel').addEventListener('click', cancel);

    // Floating animated dot (appears over everything)
    dotEl = document.createElement('div');
    dotEl.style.cssText = `
      position:fixed;z-index:10000;pointer-events:none;
      width:48px;height:48px;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #fff 10%, #00f0ff 45%, #6d28d9 100%);
      box-shadow:0 0 24px 6px rgba(0,240,255,.6);
      transform:translate(-50%,-50%);
      transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1);
      display:none;
    `;
    document.body.appendChild(dotEl);
  }

  /* ─── Public API ─────────────────────────────────────────────────────── */
  function init() {
    if (!document.getElementById('calibration-overlay')) createUI();
  }

  function start(onComplete, onCancel) {
    onCompleteCb = onComplete;
    onCancelCb   = onCancel;
    pointIndex   = 0;
    isActive     = true;

    // Build grid dots
    pointsEl.innerHTML = GRID.map((_, i) => `
      <div class="cal-pt" data-i="${i}" style="
        width:28px;height:28px;border-radius:50%;margin:auto;
        border:2px solid rgba(0,240,255,.35);
        background:rgba(0,240,255,.08);
        transition:all .3s;">
      </div>
    `).join('');

    overlay.style.display = 'flex';
    dotEl.style.display   = 'block';

    // Tell EyeTracker to start collecting
    if (typeof EyeTracker !== 'undefined') {
      EyeTracker.startCalibration();
    }

    runPoint();
  }

  async function runPoint() {
    if (!isActive) return;

    if (pointIndex >= GRID.length) {
      await finalize();
      return;
    }

    const pt  = GRID[pointIndex];
    const sx  = pt.x * window.innerWidth;
    const sy  = pt.y * window.innerHeight;

    /* Move animated dot */
    dotEl.style.left = sx + 'px';
    dotEl.style.top  = sy + 'px';

    /* Highlight grid indicator */
    overlay.querySelectorAll('.cal-pt').forEach((el, i) => {
      if (i < pointIndex) {
        el.style.background   = 'rgba(16,185,129,.5)';
        el.style.borderColor  = '#10b981';
        el.style.transform    = 'scale(1)';
      } else if (i === pointIndex) {
        el.style.background   = 'rgba(0,240,255,.35)';
        el.style.borderColor  = '#00f0ff';
        el.style.transform    = 'scale(1.4)';
        el.style.boxShadow    = '0 0 12px rgba(0,240,255,.5)';
      } else {
        el.style.background   = 'rgba(0,240,255,.08)';
        el.style.borderColor  = 'rgba(0,240,255,.35)';
        el.style.transform    = 'scale(1)';
        el.style.boxShadow    = 'none';
      }
    });

    statusEl.textContent       = `${pointIndex + 1} / ${GRID.length} نقاط`;
    progressFillEl.style.width = `${(pointIndex / GRID.length) * 100}%`;

    /* Wait for fixation hold, then record */
    await pause(HOLD_MS);
    if (!isActive) return;

    // Animate dot: shrink to signal capture
    dotEl.style.transform = 'translate(-50%,-50%) scale(0.55)';
    dotEl.style.boxShadow = '0 0 32px 12px rgba(139,92,246,.8)';

    if (typeof EyeTracker !== 'undefined') {
      await EyeTracker.recordCalibrationPoint(sx, sy, FRAMES_PER_POINT);
    }

    dotEl.style.transform = 'translate(-50%,-50%) scale(1)';
    dotEl.style.boxShadow = '0 0 24px 6px rgba(0,240,255,.6)';

    pointIndex++;
    runPoint();
  }

  async function finalize() {
    let success = false;
    if (typeof EyeTracker !== 'undefined') {
      success = EyeTracker.finalizeCalibration();
    }
    const quality = typeof EyeTracker !== 'undefined'
      ? EyeTracker.getCalibrationQuality()
      : 0;

    hide();
    if (onCompleteCb) onCompleteCb(success, quality);
  }

  function cancel() {
    isActive = false;
    hide();
    if (onCancelCb) onCancelCb();
  }

  function hide() {
    isActive          = false;
    overlay.style.display = 'none';
    dotEl.style.display   = 'none';
    progressFillEl.style.width = '0%';
  }

  function isRunning() { return isActive; }

  function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { init, start, cancel, isRunning };
})();