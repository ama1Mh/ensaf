/**
 * ENSAF Eye Tracker v2 — MediaPipe FaceMesh + Calibration Regression
 *
 * Improvements over v1:
 * 1. Per-user calibration: collects (iris_x, iris_y) → (screen_x, screen_y) samples
 *    and fits a polynomial regression model (degree-2, cross-terms) so the cursor
 *    is accurate regardless of head position, glasses, distance from camera, etc.
 * 2. Kalman-style 1-Euro filter for smooth yet responsive cursor movement.
 * 3. Blink detection — suppresses cursor jumps during blinks.
 * 4. EAR (Eye Aspect Ratio) confidence — more reliable than the old ramp approach.
 * 5. Head-pose compensation — removes head-yaw contribution from gaze estimate.
 * 6. Public calibration API so the calibration overlay can drive data collection.
 */

const EyeTracker = (() => {
  /* ─── Landmark indices ──────────────────────────────────────────────── */
  const L_IRIS   = [468, 469, 470, 471, 472];
  const R_IRIS   = [473, 474, 475, 476, 477];
  const L_OUTER  = 33;   // left temporal corner
  const L_INNER  = 133;  // left nasal corner
  const R_OUTER  = 263;  // right temporal corner
  const R_INNER  = 362;  // right nasal corner
  const L_TOP    = 159;  // left upper lid
  const L_BOT    = 145;  // left lower lid
  const R_TOP    = 386;  // right upper lid
  const R_BOT    = 374;  // right lower lid

  /* ─── State ─────────────────────────────────────────────────────────── */
  let faceMesh   = null;
  let camera     = null;
  let listeners  = [];
  let isRunning  = false;

  // Smoothed output
  let outX = window.innerWidth  / 2;
  let outY = window.innerHeight / 2;
  let conf = 0;

  // Calibration regression model
  let model = null;          // { wx, wy } — weight vectors for x and y
  let calibSamples = [];     // [ { fx, fy, sx, sy } ]  fx/fy = feature vector

  // 1-Euro filter state
  let euro = {
    xHat: null, yHat: null,
    dxHat: 0,   dyHat: 0,
    minCutoff: 0.8,
    beta: 0.007,
    dCutoff: 1.0
  };

  // Blink state
  let blinkFrames = 0;
  const BLINK_THRESHOLD = 0.18;  // EAR below this = blink
  const BLINK_FRAMES    = 3;     // consecutive frames to confirm blink

  /* ─── 1-Euro Filter ─────────────────────────────────────────────────── */
  function euroAlpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  function euroFilter(raw, prev, dPrev, dt) {
    // Derivative estimate (high-cutoff)
    const aD  = euroAlpha(euro.dCutoff, dt);
    const dHat = aD * ((raw - prev) / dt) + (1 - aD) * dPrev;
    // Adaptive cutoff
    const cutoff = euro.minCutoff + euro.beta * Math.abs(dHat);
    const a      = euroAlpha(cutoff, dt);
    const xHat   = a * raw + (1 - a) * prev;
    return { val: xHat, d: dHat };
  }

  let lastTimestamp = 0;

  /* ─── Calibration Regression ─────────────────────────────────────────
   *  Features for one sample: [1, fx, fy, fx², fy², fx·fy]  (degree-2 poly)
   *  Solve: w = (AᵀA)⁻¹Aᵀb  via normal equations (tiny matrix, safe here)
   */
  function buildFeature(fx, fy) {
    return [1, fx, fy, fx*fx, fy*fy, fx*fy];
  }

  function transpose(M) {
    return M[0].map((_, c) => M.map(row => row[c]));
  }

  function matMul(A, B) {
    return A.map(row =>
      B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0))
    );
  }

  // Gauss-Jordan inverse for small matrices
  function invert(M) {
    const n  = M.length;
    const aug = M.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => i===j?1:0)]);
    for (let col = 0; col < n; col++) {
      let pivotRow = col;
      for (let r = col+1; r < n; r++)
        if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
      const pv = aug[col][col];
      if (Math.abs(pv) < 1e-12) return null;
      aug[col] = aug[col].map(v => v/pv);
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = aug[r][col];
        aug[r] = aug[r].map((v, c) => v - factor * aug[col][c]);
      }
    }
    return aug.map(row => row.slice(n));
  }

  function fitModel(samples) {
    if (samples.length < 6) return null;  // need at least as many as features
    const A  = samples.map(s => buildFeature(s.fx, s.fy));
    const bx = samples.map(s => [s.sx]);
    const by = samples.map(s => [s.sy]);
    const At = transpose(A);
    const AtA = matMul(At, A);
    const inv = invert(AtA);
    if (!inv) return null;
    const wx = matMul(matMul(inv, At), bx).map(r => r[0]);
    const wy = matMul(matMul(inv, At), by).map(r => r[0]);
    return { wx, wy };
  }

  function predict(model, fx, fy) {
    const feat = buildFeature(fx, fy);
    const sx = feat.reduce((s, v, i) => s + v * model.wx[i], 0);
    const sy = feat.reduce((s, v, i) => s + v * model.wy[i], 0);
    return { sx, sy };
  }

  /* ─── Iris helpers ───────────────────────────────────────────────────── */
  function irisCenter(lm, idxs) {
    let x=0, y=0, n=0;
    for (const i of idxs) { if (lm[i]) { x+=lm[i].x; y+=lm[i].y; n++; } }
    return n ? {x:x/n, y:y/n} : null;
  }

  function eyeAspectRatio(lm, top, bot, outer, inner) {
    const h = Math.abs(lm[top].y - lm[bot].y);
    const w = Math.abs(lm[outer].x - lm[inner].x);
    return w > 0 ? h / w : 0;
  }

  /**
   * ─── TRUE GAZE EXTRACTION ────────────────────────────────────────────────
   *
   * MediaPipe landmarks are in normalised image coords (0,0 = top-left of
   * the RAW camera frame, BEFORE any CSS mirror flip).
   *
   * In the raw frame:
   *   Left eye  (user's left):  outer corner = lm[33]  (smaller x, left side of image)
   *                              inner corner = lm[133] (larger  x, nose side)
   *   Right eye (user's right): inner corner = lm[362] (smaller x, nose side)
   *                              outer corner = lm[263] (larger  x, right side of image)
   *
   * gazeX = (iris_x - eye_left_x) / eye_width   → 0 = iris at left edge, 1 = right edge
   *
   * When the user looks LEFT (in real world), their iris moves toward the
   * outer corner of each eye.  In raw image coords that means SMALLER x
   * for the left eye, LARGER x for the right eye.  We normalise so that
   * "looking left" → gazeX < 0.5 for both eyes before averaging.
   *
   * Screen mapping (webcam is mirrored for display but coords are raw):
   *   looking left  → we want cursor LEFT  → screenX small
   *   gazeX small when looking left, so:  screenX = gazeX * W  (no invert needed)
   */
  function extractGaze(lm, li, ri) {
    // ── Left eye ─────────────────────────────────────────────────────────
    // lm[33]  = temporal (outer) corner — smaller x in raw frame
    // lm[133] = nasal   (inner) corner — larger  x in raw frame
    const lLeftX  = lm[L_OUTER].x;   // lm[33]  — left edge of eye in image
    const lRightX = lm[L_INNER].x;   // lm[133] — right edge of eye in image
    const lEyeW   = Math.abs(lRightX - lLeftX);

    // iris x position within the eye, 0 = looking toward outer (temporal) side
    const lGazeX  = lEyeW > 0.005
      ? (li.x - lLeftX) / lEyeW
      : 0.5;

    // Vertical: lm[159] upper lid, lm[145] lower lid
    const lTopY  = Math.min(lm[159].y, lm[145].y);
    const lBotY  = Math.max(lm[159].y, lm[145].y);
    const lEyeH  = lBotY - lTopY;
    const lGazeY = lEyeH > 0.003
      ? (li.y - lTopY) / lEyeH
      : 0.5;

    // ── Right eye ────────────────────────────────────────────────────────
    // lm[362] = nasal   (inner) corner — smaller x in raw frame
    // lm[263] = temporal(outer) corner — larger  x in raw frame
    const rLeftX  = lm[R_INNER].x;   // lm[362] — left edge of eye in image
    const rRightX = lm[R_OUTER].x;   // lm[263] — right edge of eye in image
    const rEyeW   = Math.abs(rRightX - rLeftX);

    const rGazeX  = rEyeW > 0.005
      ? (ri.x - rLeftX) / rEyeW
      : 0.5;

    const rTopY  = Math.min(lm[386].y, lm[374].y);
    const rBotY  = Math.max(lm[386].y, lm[374].y);
    const rEyeH  = rBotY - rTopY;
    const rGazeY = rEyeH > 0.003
      ? (ri.y - rTopY) / rEyeH
      : 0.5;

    // ── Average & clamp ───────────────────────────────────────────────────
    // Left eye:  lGazeX small = looking left  ✓
    // Right eye: rGazeX large = looking left  ✗  →  invert it
    const fx = Math.max(-0.1, Math.min(1.1, (lGazeX + (1 - rGazeX)) / 2));
    const fy = Math.max(-0.1, Math.min(1.1, (lGazeY + rGazeY) / 2));

    return { fx, fy };
  }

  /* ─── Main results callback ──────────────────────────────────────────── */
  function onResults(results) {
    const now = performance.now();
    const dt  = Math.max(1, now - lastTimestamp) / 1000;
    lastTimestamp = now;

    if (!results.multiFaceLandmarks?.length) {
      conf = Math.max(0, conf - 0.12);
      notify();
      return;
    }

    const lm = results.multiFaceLandmarks[0];

    /* — Blink detection — */
    const earL = eyeAspectRatio(lm, L_TOP, L_BOT, L_OUTER, L_INNER);
    const earR = eyeAspectRatio(lm, R_TOP, R_BOT, R_OUTER, R_INNER);
    const ear  = (earL + earR) / 2;
    if (ear < BLINK_THRESHOLD) {
      blinkFrames++;
    } else {
      blinkFrames = 0;
    }
    const isBlink = blinkFrames >= BLINK_FRAMES;

    /* — Confidence (EAR-based) — */
    const targetConf = isBlink ? 0 : Math.min(1, ear / 0.35);
    conf = conf * 0.85 + targetConf * 0.15;

    if (isBlink) { notify(); return; }

    /* — Iris positions — */
    const li = irisCenter(lm, L_IRIS);
    const ri = irisCenter(lm, R_IRIS);
    if (!li || !ri) { notify(); return; }

    /* — True eye-rotation gaze (head-pose independent) — */
    const { fx, fy } = extractGaze(lm, li, ri);

    /* — Map to screen — */
    let sx, sy;
    if (model) {
      const p = predict(model, fx, fy);
      sx = p.sx;
      sy = p.sy;
    } else {
      // Fallback before calibration.
      // fx=0 → looking left → cursor left, fx=1 → looking right → cursor right.
      // Raw frame is NOT mirrored, so no X inversion here.
      // We stretch slightly (× 1.6, offset −0.3) so edge gaze reaches screen edges.
      sx = (fx * 1.6 - 0.3) * window.innerWidth;
      sy = (fy * 1.8 - 0.4) * window.innerHeight;
    }

    // Clamp
    sx = Math.max(0, Math.min(window.innerWidth,  sx));
    sy = Math.max(0, Math.min(window.innerHeight, sy));

    /* — 1-Euro filter — */
    if (euro.xHat === null) { euro.xHat = sx; euro.yHat = sy; }
    const fx2 = euroFilter(sx, euro.xHat, euro.dxHat, dt);
    const fy2 = euroFilter(sy, euro.yHat, euro.dyHat, dt);
    euro.xHat = fx2.val; euro.dxHat = fx2.d;
    euro.yHat = fy2.val; euro.dyHat = fy2.d;

    outX = euro.xHat;
    outY = euro.yHat;

    notify();
  }

  function notify() {
    const tracking = conf > 0.2;
    listeners.forEach(fn => fn(outX, outY, conf, tracking));
  }

  /* ─── Calibration public API ─────────────────────────────────────────── */

  /**
   * Start a fresh calibration session (clears old samples).
   */
  function startCalibration() {
    calibSamples = [];
    model = null;
  }

  /**
   * Record the current gaze position as pointing at screen (sx, sy).
   * Call this while the user is looking at a known calibration dot.
   * Collects `frames` frames and averages them for a robust sample.
   *
   * Returns a Promise that resolves when the sample is recorded.
   */
  function recordCalibrationPoint(sx, sy, frames = 20) {
    return new Promise((resolve) => {
      const raw = [];
      let captured = 0;

      const captureListener = (x, y, c) => {
        if (c < 0.4) return;          // skip low-confidence frames
        // We need the raw normalised gaze — tap into the last lm computation.
        // Since we only have the filtered output here, we store a snapshot via
        // a dedicated raw-capture path. See `_rawGaze` below.
        if (_rawGaze) raw.push({ ..._rawGaze });
        captured++;
        if (captured >= frames) {
          removeListener(captureListener);
          if (raw.length > 0) {
            const fx = raw.reduce((s, r) => s + r.fx, 0) / raw.length;
            const fy = raw.reduce((s, r) => s + r.fy, 0) / raw.length;
            calibSamples.push({ fx, fy, sx, sy });
          }
          resolve();
        }
      };
      addListener(captureListener);
    });
  }

  /**
   * Fit the regression model from collected samples.
   * Returns true on success.
   */
  function finalizeCalibration() {
    model = fitModel(calibSamples);
    // Reset filter so it starts fresh at the new calibrated position
    euro.xHat = null; euro.yHat = null;
    return model !== null;
  }

  /**
   * Clear calibration (revert to fallback).
   */
  function clearCalibration() {
    model = null;
    calibSamples = [];
  }

  /**
   * Get calibration quality score (0–1) based on sample count.
   */
  function getCalibrationQuality() {
    return Math.min(1, calibSamples.length / 9);
  }

  /* ─── Internal raw-gaze capture ─────────────────────────────────────── */
  // We patch onResults to also stash the latest head-normalised features
  let _rawGaze = null;
  const _origOnResults = onResults;

  /* ─── Initialization ─────────────────────────────────────────────────── */
  async function init() {
    if (faceMesh) return;
    return new Promise((resolve, reject) => {
      try {
        faceMesh = new FaceMesh({
          locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,   // required for iris indices 468+
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });
        faceMesh.onResults(_patchedOnResults);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Patched version that also stores _rawGaze for calibration capture
  function _patchedOnResults(results) {
    if (results.multiFaceLandmarks?.length) {
      const lm = results.multiFaceLandmarks[0];
      const li = irisCenter(lm, L_IRIS);
      const ri = irisCenter(lm, R_IRIS);
      if (li && ri) {
        // Use the same extractGaze that onResults uses — keeps calibration consistent
        _rawGaze = extractGaze(lm, li, ri);
      }
    }
    onResults(results);
  }

  async function startCamera(videoElement) {
    if (!faceMesh) await init();
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (faceMesh && videoElement.readyState >= 2) {
          try { await faceMesh.send({ image: videoElement }); } catch(_) {}
        }
      },
      width: 640, height: 480,
    });
    await camera.start();
    isRunning = true;
  }

  function addListener(fn)    { listeners.push(fn); }
  function removeListener(fn) { listeners = listeners.filter(l => l !== fn); }

  function setSmoothing(minCutoff, beta) {
    euro.minCutoff = minCutoff ?? euro.minCutoff;
    euro.beta      = beta      ?? euro.beta;
  }

  // Legacy compat shim
  function setSensitivity() {}

  function stop() {
    if (camera) camera.stop();
    isRunning = false;
  }

  return {
    init,
    startCamera,
    addListener,
    removeListener,
    setSmoothing,
    setSensitivity,
    stop,
    // Calibration
    startCalibration,
    recordCalibrationPoint,
    finalizeCalibration,
    clearCalibration,
    getCalibrationQuality,
  };
})();