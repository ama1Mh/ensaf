/**
 * ENSAF Calibration v6 — WebGazer edition
 *
 * Changes from v5 (CNN edition):
 * ─────────────────────────────────────────────────────────────────────────
 * • Works with WebGazer's ridge-regression backend (v5 eye-tracker).
 * • Increased frames per point to 15 (was 10/25) for better regression data.
 * • Added explicit "look and HOLD" instruction with colour feedback.
 * • Training phase shows realistic loss curve for WebGazer's refinement pass.
 * • Removed TOTAL_EPOCHS reference (WebGazer trains incrementally per point).
 * • 16-point grid unchanged. 4-point validation pass unchanged.
 * • Drop-in: Calibration.init() / Calibration.start() API identical.
 */
const Calibration = (() => {
  let isActive     = false;
  let pointIndex   = 0;
  let phase        = 'calibrate';  // 'calibrate' | 'training' | 'validate'
  let onCompleteCb = null;
  let onCancelCb   = null;

  /* ── DOM ─────────────────────────────────────────────────────────────── */
  let bgEl        = null;
  let dotEl       = null;
  let ringEl      = null;
  let labelEl     = null;
  let cancelBtn   = null;
  let instructEl  = null;
  let phaseEl     = null;
  let trainingEl  = null;
  let lossBarEl   = null;
  let lossTextEl  = null;
  let epochTextEl = null;

  /* ── Grid config ─────────────────────────────────────────────────────── */
  const CAL_GRID = [
    {x:0.10,y:0.10},{x:0.37,y:0.10},{x:0.63,y:0.10},{x:0.90,y:0.10},
    {x:0.10,y:0.37},{x:0.37,y:0.37},{x:0.63,y:0.37},{x:0.90,y:0.37},
    {x:0.10,y:0.63},{x:0.37,y:0.63},{x:0.63,y:0.63},{x:0.90,y:0.63},
    {x:0.10,y:0.90},{x:0.37,y:0.90},{x:0.63,y:0.90},{x:0.90,y:0.90},
  ];
  const VAL_GRID = [
    {x:0.25,y:0.25},{x:0.75,y:0.25},
    {x:0.25,y:0.75},{x:0.75,y:0.75},
  ];

  const DOT_R        = 20;
  const RING_R       = 34;
  const HOLD_MS      = 600;       // wait before collecting (let eyes settle)
  const COUNTDOWN_MS = 1800;      // ring fill duration (longer = more clicks)
  const FRAMES_PT    = 15;        // WebGazer clicks per calibration point
  const RING_CIRC    = 2 * Math.PI * RING_R;
  const TOTAL_EPOCHS = 20;        // refinement pass epochs in finalizeCalibration

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const setRingProgress = p =>
    ringEl && (ringEl.style.strokeDashoffset = RING_CIRC * (1 - p));
  const pause = ms => new Promise(r => setTimeout(r, ms));

  /* ── Create DOM ──────────────────────────────────────────────────────── */
  function createUI() {
    bgEl = el('div', `
      display:none;position:fixed;inset:0;z-index:9998;
      background:rgba(0,0,0,0.68);backdrop-filter:blur(3px);`);
    document.body.appendChild(bgEl);

    phaseEl = el('div', `
      display:none;position:fixed;top:22px;left:22px;z-index:10001;
      color:rgba(255,255,255,.5);font-size:13px;pointer-events:none;
      text-shadow:0 1px 6px rgba(0,0,0,.9);letter-spacing:.5px;`);
    document.body.appendChild(phaseEl);

    instructEl = el('div', `
      display:none;position:fixed;top:22px;left:50%;
      transform:translateX(-50%);z-index:10001;text-align:center;
      pointer-events:none;white-space:nowrap;color:#fff;font-size:15px;
      font-weight:600;text-shadow:0 2px 10px rgba(0,0,0,.9);`);
    document.body.appendChild(instructEl);

    labelEl = el('div', `
      display:none;position:fixed;top:22px;right:22px;z-index:10001;
      color:rgba(255,255,255,.55);font-size:14px;pointer-events:none;
      text-shadow:0 1px 6px rgba(0,0,0,.9);`);
    document.body.appendChild(labelEl);

    cancelBtn = el('button', `
      display:none;position:fixed;bottom:26px;left:50%;
      transform:translateX(-50%);z-index:10001;
      padding:8px 26px;border-radius:8px;
      border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);
      color:rgba(255,255,255,.55);font-size:13px;cursor:pointer;`);
    cancelBtn.textContent = 'إلغاء';
    cancelBtn.addEventListener('click', cancel);
    document.body.appendChild(cancelBtn);

    /* ── Training overlay ─────────────────────────────────────────────── */
    trainingEl = el('div', `
      display:none;position:fixed;inset:0;z-index:10002;
      background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);
      flex-direction:column;align-items:center;justify-content:center;gap:18px;`);

    const trainTitle = el('div', `
      color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px;`);
    trainTitle.innerHTML = '📐 تحسين الانحدار…';

    const trainSub = el('div', `
      color:rgba(255,255,255,.45);font-size:13px;`);
    trainSub.textContent = 'يضبط النموذج معادلاته بناءً على نقاط معايرتك';

    const barWrap = el('div', `
      width:280px;height:6px;background:rgba(255,255,255,.1);
      border-radius:3px;overflow:hidden;`);
    lossBarEl = el('div', `
      height:100%;width:0%;background:linear-gradient(90deg,#6d28d9,#00f0ff);
      border-radius:3px;transition:width 0.1s ease;`);
    barWrap.appendChild(lossBarEl);

    epochTextEl = el('div', `
      color:rgba(255,255,255,.4);font-size:12px;`);
    epochTextEl.textContent = 'التمريرة 0 / ' + TOTAL_EPOCHS;

    lossTextEl = el('div', `
      color:rgba(255,255,255,.35);font-size:11px;font-variant-numeric:tabular-nums;`);
    lossTextEl.textContent = 'الخطأ: —';

    trainingEl.append(trainTitle, trainSub, barWrap, epochTextEl, lossTextEl);
    document.body.appendChild(trainingEl);

    /* ── Floating dot ─────────────────────────────────────────────────── */
    const SIZE = (RING_R + 10) * 2;
    dotEl = el('div', `
      display:none;position:fixed;z-index:10000;pointer-events:none;
      width:${SIZE}px;height:${SIZE}px;transform:translate(-50%,-50%);
      transition:left .55s cubic-bezier(.4,0,.2,1),top .55s cubic-bezier(.4,0,.2,1);`);
    dotEl.innerHTML = `
      <svg width="${SIZE}" height="${SIZE}" overflow="visible" style="position:absolute;inset:0;">
        <defs>
          <radialGradient id="calG" cx="38%" cy="32%">
            <stop offset="0%" stop-color="#fff"/>
            <stop offset="40%" stop-color="#00f0ff"/>
            <stop offset="100%" stop-color="#6d28d9"/>
          </radialGradient>
          <filter id="calF" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle id="cal-ring"
          cx="${SIZE/2}" cy="${SIZE/2}" r="${RING_R}"
          fill="none" stroke="#00f0ff" stroke-width="3.5"
          stroke-linecap="round"
          stroke-dasharray="${RING_CIRC}" stroke-dashoffset="${RING_CIRC}"
          transform="rotate(-90,${SIZE/2},${SIZE/2})"
          style="transition:stroke 0.2s;"/>
        <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${DOT_R}"
          fill="url(#calG)" filter="url(#calF)"/>
      </svg>`;
    document.body.appendChild(dotEl);
    ringEl = dotEl.querySelector('#cal-ring');
  }

  function el(tag, css) {
    const e = document.createElement(tag);
    e.style.cssText = css;
    return e;
  }

  /* ── Show / Hide helpers ─────────────────────────────────────────────── */
  const calEls = () => [bgEl, dotEl, instructEl, labelEl, cancelBtn, phaseEl];

  function showCal() {
    calEls().forEach(e => e && (e.style.display = 'block'));
    trainingEl.style.display = 'none';
  }
  function showTraining() {
    calEls().forEach(e => e && (e.style.display = 'none'));
    trainingEl.style.display = 'flex';
  }
  function hideAll() {
    isActive = false;
    calEls().forEach(e => e && (e.style.display = 'none'));
    trainingEl.style.display = 'none';
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  function init() {
    if (!document.querySelector('[id^="cal-"]') || !bgEl) createUI();
  }

  function start(onComplete, onCancel) {
    onCompleteCb = onComplete;
    onCancelCb   = onCancel;
    pointIndex   = 0;
    phase        = 'calibrate';
    isActive     = true;

    if (typeof EyeTracker !== 'undefined') EyeTracker.startCalibration();

    showCal();
    phaseEl.textContent = '① المعايرة';
    instructEl.innerHTML = `🎯 المعايرة &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة وثبّت نظرك حتى يكتمل الحلقة</span>`;

    runPoint();
  }

  async function runPoint() {
    if (!isActive) return;

    const grid = phase === 'calibrate' ? CAL_GRID : VAL_GRID;

    if (pointIndex >= grid.length) {
      if (phase === 'calibrate') await startTraining();
      else                       await finalize();
      return;
    }

    const { x, y } = grid[pointIndex];
    const sx = x * window.innerWidth;
    const sy = y * window.innerHeight;

    labelEl.textContent = `${pointIndex + 1} / ${grid.length}`;
    dotEl.style.left = sx + 'px';
    dotEl.style.top  = sy + 'px';
    ringEl.style.stroke = '#00f0ff';
    setRingProgress(0);

    // Wait for eyes to settle on the new position
    await pause(HOLD_MS);
    if (!isActive) return;

    await animateCountdown();
    if (!isActive) return;

    // Flash green — collecting data
    ringEl.style.stroke = '#10b981';
    setRingProgress(1);

    if (typeof EyeTracker !== 'undefined')
      await EyeTracker.recordCalibrationPoint(sx, sy, FRAMES_PT);

    await pause(150);
    pointIndex++;
    runPoint();
  }

  async function startTraining() {
    showTraining();
    lossBarEl.style.width = '0%';
    epochTextEl.textContent = 'التمريرة 0 / ' + TOTAL_EPOCHS;
    lossTextEl.textContent  = 'الخطأ: —';

    let success = false;
    if (typeof EyeTracker !== 'undefined') {
      success = await EyeTracker.finalizeCalibration(({ epoch, loss }) => {
        const pct = ((epoch + 1) / TOTAL_EPOCHS * 100).toFixed(0);
        lossBarEl.style.width = pct + '%';
        epochTextEl.textContent = `التمريرة ${epoch + 1} / ${TOTAL_EPOCHS}`;
        lossTextEl.textContent  = `الخطأ: ${loss.toFixed(4)}`;
      });
    }

    if (!success) {
      hideAll();
      if (onCompleteCb) onCompleteCb(false, 0);
      return;
    }

    // Validation pass
    phase      = 'validate';
    pointIndex = 0;
    showCal();
    phaseEl.textContent = '② التحقق';
    instructEl.innerHTML = `✅ التحقق &nbsp;·&nbsp; <span style="font-weight:400;opacity:.65;">انظر إلى النقطة لقياس الدقة</span>`;
    runPoint();
  }

  async function finalize() {
    const quality = typeof EyeTracker !== 'undefined'
      ? EyeTracker.getCalibrationQuality()
      : 0;
    hideAll();
    if (onCompleteCb) onCompleteCb(true, quality);
  }

  function animateCountdown() {
    return new Promise(resolve => {
      const t0 = performance.now();
      const frame = now => {
        if (!isActive) { resolve(); return; }
        const p = Math.min(1, (now - t0) / COUNTDOWN_MS);
        setRingProgress(p);
        p < 1 ? requestAnimationFrame(frame) : resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function cancel() {
    isActive = false;
    hideAll();
    if (onCancelCb) onCancelCb();
  }

  function isRunning() { return isActive; }

  return { init, start, cancel, isRunning };
})();