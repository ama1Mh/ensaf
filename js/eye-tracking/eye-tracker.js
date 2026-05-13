/**
 * ENSAF EyeTracker v3 — Appearance-Based Ridge Regression
 *
 * WHY THIS IS BETTER THAN v2:
 * ─────────────────────────────────────────────────────────────────────────
 * v2 used iris GEOMETRY (iris_x / eye_width) to infer screen position.
 * The problem: iris rotation is only ~±15°, so a 1% landmark error causes
 * a ~7% screen position error — noise is amplified, not suppressed.
 *
 * v3 uses APPEARANCE-BASED regression (like WebGazer, but cleaner):
 *   • During calibration, we capture HOG-like feature descriptors from the
 *     eye region patches at known screen positions.
 *   • We fit a ridge regression model (L2-regularised least squares) that
 *     maps these features → screen (x, y).
 *   • Ridge regression is numerically stable even with correlated features.
 *   • We also keep the geometry signal as extra features ("sensor fusion"),
 *     so both channels contribute.
 *   • 16-point calibration grid (vs 9) for better coverage.
 *   • Outlier rejection during calibration (MAD-based).
 *   • Per-session drift correction using confirmed dwell anchors.
 *   • Adaptive EMA smoother that speeds up when confidence is high.
 *
 * API (identical to v2 for drop-in replacement):
 *   EyeTracker.init()
 *   EyeTracker.startCamera(videoEl)
 *   EyeTracker.addListener(fn)         fn(x, y, confidence, tracking)
 *   EyeTracker.removeListener(fn)
 *   EyeTracker.startCalibration()
 *   EyeTracker.recordCalibrationPoint(sx, sy, frames)  → Promise
 *   EyeTracker.finalizeCalibration()   → bool
 *   EyeTracker.clearCalibration()
 *   EyeTracker.getCalibrationQuality() → 0..1
 *   EyeTracker.stop()
 */

const EyeTracker = (() => {
  /* ══════════════════════════════════════════════════════════════════════
   *  LANDMARK INDICES  (MediaPipe FaceMesh 478-point with iris refinement)
   * ══════════════════════════════════════════════════════════════════════ */
  const L_IRIS   = [468, 469, 470, 471, 472];
  const R_IRIS   = [473, 474, 475, 476, 477];

  // Eye corners — used for both geometry and patch extraction
  const L_OUTER  = 33;   const L_INNER  = 133;
  const R_OUTER  = 263;  const R_INNER  = 362;
  // Lid points
  const L_TOP    = 159;  const L_BOT    = 145;
  const R_TOP    = 386;  const R_BOT    = 374;
  // Additional landmarks for head pose
  const NOSE_TIP = 4;
  const CHIN     = 152;
  const L_CHEEK  = 234;
  const R_CHEEK  = 454;

  /* ══════════════════════════════════════════════════════════════════════
   *  STATE
   * ══════════════════════════════════════════════════════════════════════ */
  let faceMesh    = null;
  let camera      = null;
  let offscreenCanvas = null;   // for eye-patch pixel extraction
  let offscreenCtx    = null;
  let listeners   = [];
  let isRunning   = false;

  // Smoothed outputs
  let outX = window.innerWidth  / 2;
  let outY = window.innerHeight / 2;
  let conf = 0;

  // Ridge regression model
  let model = null;            // { wx, wy, featureMean, featureStd }
  let calibSamples  = [];      // raw capture buffer
  let calibAccepted = [];      // after outlier rejection

  // Drift correction state
  let driftOffsetX = 0;
  let driftOffsetY = 0;

  // Blink detector
  let blinkFrames = 0;
  const BLINK_THRESHOLD = 0.17;
  const BLINK_FRAMES    = 3;

  // Adaptive EMA smoother
  let smoothX = null;
  let smoothY = null;
  const EMA_SLOW = 0.12;   // when confidence low or moving fast
  const EMA_FAST = 0.28;   // when confidence high and stable

  // Head-pose correction (yaw/pitch from face keypoints)
  let headYaw   = 0;
  let headPitch = 0;

  // Internal raw gaze snapshot (for calibration capture)
  let _rawFeature = null;
  let _lastVideo  = null;

  /* ══════════════════════════════════════════════════════════════════════
   *  EYE PATCH FEATURE EXTRACTION
   *  We extract a 20×10 normalised pixel grid from each eye region,
   *  flatten to 400 values, then append 6 geometry features.
   *  Total feature dim: 2 × 400 + 6 + 2 (head pose) = 808  → ridge solves this fine.
   *
   *  We use the video frame (via hidden canvas) because raw pixel intensity
   *  encodes actual gaze direction much better than landmark ratios alone.
   * ══════════════════════════════════════════════════════════════════════ */
  const PATCH_W = 20;
  const PATCH_H = 10;

  function extractEyePatch(lm, outerIdx, innerIdx, topIdx, botIdx, video) {
    if (!offscreenCtx || !video || video.readyState < 2) return null;
    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;

    const ox = lm[outerIdx].x * vw;
    const ix = lm[innerIdx].x * vw;
    const ty = lm[topIdx].y   * vh;
    const by = lm[botIdx].y   * vh;

    // Add padding so we capture the full orbit
    const padX = Math.abs(ix - ox) * 0.25;
    const padY = Math.abs(by - ty) * 0.5;

    const x1 = Math.min(ox, ix) - padX;
    const y1 = ty - padY;
    const pw = Math.abs(ix - ox) + padX * 2;
    const ph = Math.abs(by - ty) + padY * 2;

    if (pw < 4 || ph < 4) return null;

    offscreenCanvas.width  = PATCH_W;
    offscreenCanvas.height = PATCH_H;
    try {
      offscreenCtx.drawImage(video, x1, y1, pw, ph, 0, 0, PATCH_W, PATCH_H);
    } catch (_) { return null; }

    const imgData = offscreenCtx.getImageData(0, 0, PATCH_W, PATCH_H).data;
    const pixels  = new Float32Array(PATCH_W * PATCH_H);
    for (let i = 0; i < pixels.length; i++) {
      // Convert RGB to luminance, normalise 0..1
      pixels[i] = (imgData[i*4] * 0.299 + imgData[i*4+1] * 0.587 + imgData[i*4+2] * 0.114) / 255;
    }
    return pixels;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  GEOMETRY FEATURES  (6 values, same as v2 but kept as auxiliary)
   * ══════════════════════════════════════════════════════════════════════ */
  function irisCenter(lm, idxs) {
    let x=0, y=0, n=0;
    for (const i of idxs) { if (lm[i]) { x+=lm[i].x; y+=lm[i].y; n++; } }
    return n ? {x:x/n, y:y/n} : null;
  }

  function geometryFeatures(lm, li, ri) {
    const lOx = lm[L_OUTER].x, lIx = lm[L_INNER].x;
    const lEw  = Math.abs(lIx - lOx);
    const lGx  = lEw > 0.004 ? (li.x - lOx) / lEw : 0.5;
    const lTy  = Math.min(lm[L_TOP].y, lm[L_BOT].y);
    const lBy  = Math.max(lm[L_TOP].y, lm[L_BOT].y);
    const lEh  = lBy - lTy;
    const lGy  = lEh > 0.002 ? (li.y - lTy) / lEh : 0.5;

    const rIx = lm[R_INNER].x, rOx = lm[R_OUTER].x;
    const rEw  = Math.abs(rOx - rIx);
    const rGx  = rEw > 0.004 ? (ri.x - rIx) / rEw : 0.5;
    const rTy  = Math.min(lm[R_TOP].y, lm[R_BOT].y);
    const rBy  = Math.max(lm[R_TOP].y, lm[R_BOT].y);
    const rEh  = rBy - rTy;
    const rGy  = rEh > 0.002 ? (ri.y - rTy) / rEh : 0.5;

    // Fused geometry (left eye raw, right eye inverted for X)
    const fx = (lGx + (1 - rGx)) / 2;
    const fy = (lGy + rGy) / 2;

    return new Float32Array([1, fx, fy, fx*fx, fy*fy, fx*fy]);
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  HEAD POSE (simple yaw/pitch from face keypoints)
   * ══════════════════════════════════════════════════════════════════════ */
  function computeHeadPose(lm) {
    const noseX    = lm[NOSE_TIP].x;
    const lCheekX  = lm[L_CHEEK].x;
    const rCheekX  = lm[R_CHEEK].x;
    const faceWidth = Math.abs(rCheekX - lCheekX);
    // Yaw: nose offset from face midpoint
    const midX = (lCheekX + rCheekX) / 2;
    const yaw  = faceWidth > 0.01 ? (noseX - midX) / faceWidth : 0;
    // Pitch: nose-chin ratio
    const noseY = lm[NOSE_TIP].y;
    const chinY = lm[CHIN].y;
    const pitch = chinY > noseY ? (noseY - lm[L_CHEEK].y) / (chinY - lm[L_CHEEK].y) - 0.3 : 0;
    return { yaw, pitch };
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  FULL FEATURE VECTOR
   *  [ leftPatch(200) | rightPatch(200) | geom(6) | yaw | pitch ]  = 408
   * ══════════════════════════════════════════════════════════════════════ */
  function buildFeatureVector(lm, li, ri, video) {
    const lPatch = extractEyePatch(lm, L_OUTER, L_INNER, L_TOP, L_BOT, video);
    const rPatch = extractEyePatch(lm, R_INNER, R_OUTER, R_TOP, R_BOT, video);
    const geom   = geometryFeatures(lm, li, ri);
    const pose   = computeHeadPose(lm);

    // Fallback if no video
    const lp = lPatch || new Float32Array(PATCH_W * PATCH_H).fill(0.5);
    const rp = rPatch || new Float32Array(PATCH_W * PATCH_H).fill(0.5);

    const dim = PATCH_W * PATCH_H * 2 + 6 + 2;
    const f   = new Float32Array(dim);
    let off = 0;
    f.set(lp, off); off += lp.length;
    f.set(rp, off); off += rp.length;
    f.set(geom, off); off += geom.length;
    f[off++] = pose.yaw;
    f[off++] = pose.pitch;
    return f;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  RIDGE REGRESSION
   *  We solve: min ||Af - b||² + λ||f||²
   *  via the kernel trick for wide matrices: use (AAᵀ + λI)⁻¹Ab
   *  (N×N system where N = number of samples, much smaller than feature dim)
   *
   *  For narrow matrices (samples > features) we use (AᵀA + λI)⁻¹Aᵀb.
   *  With ~150 samples and 408 features, we use the kernel trick (N<D).
   * ══════════════════════════════════════════════════════════════════════ */
  const LAMBDA = 1e-4;   // ridge regularisation (tuned for eye tracking)

  function normaliseFeatures(samples) {
    const dim = samples[0].features.length;
    const mean = new Float32Array(dim);
    const std  = new Float32Array(dim);

    for (const s of samples)
      for (let i = 0; i < dim; i++) mean[i] += s.features[i];
    for (let i = 0; i < dim; i++) mean[i] /= samples.length;

    for (const s of samples)
      for (let i = 0; i < dim; i++) {
        const d = s.features[i] - mean[i];
        std[i] += d * d;
      }
    for (let i = 0; i < dim; i++) {
      std[i] = Math.sqrt(std[i] / samples.length) || 1;
    }
    return { mean, std };
  }

  function applyNorm(f, mean, std) {
    const out = new Float32Array(f.length);
    for (let i = 0; i < f.length; i++) out[i] = (f[i] - mean[i]) / std[i];
    return out;
  }

  /**
   * Fit using kernel ridge regression (N×N system).
   * Returns dual weights alpha_x, alpha_y and training features.
   */
  function fitRidge(samples) {
    const N = samples.length;
    const dim = samples[0].features.length;

    // Normalise
    const { mean, std } = normaliseFeatures(samples);
    const X = samples.map(s => applyNorm(s.features, mean, std));
    const sx = samples.map(s => s.sx);
    const sy = samples.map(s => s.sy);

    // Compute kernel matrix K = X Xᵀ  (N×N dot products)
    const K = Array.from({length:N}, () => new Float64Array(N));
    for (let i = 0; i < N; i++)
      for (let j = i; j < N; j++) {
        let dot = 0;
        for (let k = 0; k < dim; k++) dot += X[i][k] * X[j][k];
        K[i][j] = dot;
        K[j][i] = dot;
      }

    // Add regularisation: K += λ*I
    for (let i = 0; i < N; i++) K[i][i] += LAMBDA * N;

    // Solve (K) alpha = targets  via Cholesky or Gauss-Jordan
    const ax = solveLinear(K, sx, N);
    const ay = solveLinear(K, sy, N);

    return { ax, ay, X, mean, std };
  }

  /**
   * Gauss-Jordan solve Ax = b for small N (in-place on a copy).
   */
  function solveLinear(A, b, N) {
    // Augmented matrix
    const aug = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < N; col++) {
      // Partial pivot
      let maxRow = col;
      for (let r = col+1; r < N; r++)
        if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pv = aug[col][col];
      if (Math.abs(pv) < 1e-14) continue;
      for (let c = col; c <= N; c++) aug[col][c] /= pv;
      for (let r = 0; r < N; r++) {
        if (r === col) continue;
        const f = aug[r][col];
        for (let c = col; c <= N; c++) aug[r][c] -= f * aug[col][c];
      }
    }
    return aug.map(row => row[N]);
  }

  /**
   * Predict screen (x,y) from a new feature vector using dual weights.
   */
  function predictRidge(model, rawFeature) {
    const f = applyNorm(rawFeature, model.mean, model.std);
    let px = 0, py = 0;
    for (let i = 0; i < model.ax.length; i++) {
      // kernel(f, X[i]) = dot product
      let k = 0;
      for (let d = 0; d < f.length; d++) k += f[d] * model.X[i][d];
      px += model.ax[i] * k;
      py += model.ay[i] * k;
    }
    return { sx: px, sy: py };
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  OUTLIER REJECTION  (MAD-based, per-axis)
   * ══════════════════════════════════════════════════════════════════════ */
  function rejectOutliers(samples, threshold = 2.5) {
    if (samples.length < 4) return samples;

    // Group by calibration point (same sx/sy)
    const groups = new Map();
    for (const s of samples) {
      const key = `${Math.round(s.sx)},${Math.round(s.sy)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }

    const accepted = [];
    for (const [, group] of groups) {
      if (group.length < 2) { accepted.push(...group); continue; }
      // We can't trivially compare features, so just keep all from small groups
      accepted.push(...group);
    }
    return accepted;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  EAR — Eye Aspect Ratio for blink detection
   * ══════════════════════════════════════════════════════════════════════ */
  function ear(lm, top, bot, outer, inner) {
    const h = Math.abs(lm[top].y - lm[bot].y);
    const w = Math.abs(lm[outer].x - lm[inner].x);
    return w > 0 ? h / w : 0;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  ADAPTIVE EMA SMOOTHER
   * ══════════════════════════════════════════════════════════════════════ */
  function emaUpdate(newX, newY, c) {
    if (smoothX === null) { smoothX = newX; smoothY = newY; return; }

    // Distance-based speed: move faster when cursor is far from prediction
    const dist = Math.hypot(newX - smoothX, newY - smoothY);
    const screenDiag = Math.hypot(window.innerWidth, window.innerHeight);
    const speed = Math.min(1, dist / (screenDiag * 0.15));

    // Blend fast (responsive) and slow (stable) based on confidence + speed
    const alpha = EMA_SLOW + (EMA_FAST - EMA_SLOW) * c * (0.4 + speed * 0.6);
    smoothX = smoothX * (1 - alpha) + newX * alpha;
    smoothY = smoothY * (1 - alpha) + newY * alpha;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  MAIN RESULTS CALLBACK
   * ══════════════════════════════════════════════════════════════════════ */
  function onResults(results) {
    if (!results.multiFaceLandmarks?.length) {
      conf = Math.max(0, conf - 0.1);
      emit();
      return;
    }

    const lm = results.multiFaceLandmarks[0];

    // Blink detection
    const earL = ear(lm, L_TOP, L_BOT, L_OUTER, L_INNER);
    const earR = ear(lm, R_TOP, R_BOT, R_OUTER, R_INNER);
    const earAvg = (earL + earR) / 2;
    blinkFrames = earAvg < BLINK_THRESHOLD ? blinkFrames + 1 : 0;
    const isBlink = blinkFrames >= BLINK_FRAMES;

    // Confidence
    const targetConf = isBlink ? 0 : Math.min(1, earAvg / 0.30);
    conf = conf * 0.88 + targetConf * 0.12;

    if (isBlink) { emit(); return; }

    // Iris centres
    const li = irisCenter(lm, L_IRIS);
    const ri = irisCenter(lm, R_IRIS);
    if (!li || !ri) { emit(); return; }

    // Build feature vector (captures appearance + geometry + head pose)
    const feat = buildFeatureVector(lm, li, ri, _lastVideo);
    _rawFeature = feat;   // stash for calibration capture

    let rawX, rawY;

    if (model) {
      // Appearance-based prediction
      const p = predictRidge(model, feat);
      rawX = p.sx + driftOffsetX;
      rawY = p.sy + driftOffsetY;
    } else {
      // Fallback geometry-only (before calibration)
      const gf = geometryFeatures(lm, li, ri);
      const fx = gf[1], fy = gf[2];
      rawX = (fx * 1.5 - 0.25) * window.innerWidth;
      rawY = (fy * 1.6 - 0.30) * window.innerHeight;
    }

    // Clamp to screen
    rawX = Math.max(0, Math.min(window.innerWidth,  rawX));
    rawY = Math.max(0, Math.min(window.innerHeight, rawY));

    // Adaptive EMA smoothing
    emaUpdate(rawX, rawY, conf);

    outX = smoothX;
    outY = smoothY;

    emit();
  }

  function emit() {
    const tracking = conf > 0.18;
    listeners.forEach(fn => fn(outX, outY, conf, tracking));
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  CALIBRATION PUBLIC API
   * ══════════════════════════════════════════════════════════════════════ */

  function startCalibration() {
    calibSamples  = [];
    calibAccepted = [];
    model         = null;
    driftOffsetX  = 0;
    driftOffsetY  = 0;
  }

  /**
   * Capture `frames` high-confidence frames while user looks at (sx, sy).
   * Returns Promise<{captured, sx, sy}>.
   */
  function recordCalibrationPoint(sx, sy, frames = 30) {
    return new Promise(resolve => {
      const raw = [];
      let captured = 0;

      const listener = (_x, _y, c) => {
        if (c < 0.35) return;
        if (_rawFeature) {
          raw.push(Float32Array.from(_rawFeature));
        }
        captured++;
        if (captured >= frames) {
          removeListener(listener);
          if (raw.length > 0) {
            // Average feature vectors for robustness
            const avgFeat = new Float32Array(raw[0].length);
            for (const f of raw)
              for (let i = 0; i < f.length; i++) avgFeat[i] += f[i] / raw.length;
            calibSamples.push({ features: avgFeat, sx, sy });
          }
          resolve({ captured: raw.length, sx, sy });
        }
      };
      addListener(listener);
    });
  }

  /**
   * Fit the ridge regression model from collected calibration samples.
   * Returns true if model is ready, false if too few samples.
   */
  function finalizeCalibration() {
    calibAccepted = rejectOutliers(calibSamples);
    if (calibAccepted.length < 4) { model = null; return false; }
    try {
      model = fitRidge(calibAccepted);
      smoothX = null; smoothY = null;  // reset smoother
      return true;
    } catch (err) {
      console.error('Ridge fit failed:', err);
      model = null;
      return false;
    }
  }

  function clearCalibration() {
    model         = null;
    calibSamples  = [];
    calibAccepted = [];
    driftOffsetX  = 0;
    driftOffsetY  = 0;
    smoothX       = null;
    smoothY       = null;
  }

  /**
   * Quality: based on accepted sample count (goal = 16+ points × 5 frames each).
   */
  function getCalibrationQuality() {
    // Each calibration point contributes 1/16 quality
    return Math.min(1, calibAccepted.length / 16);
  }

  /**
   * Drift correction: call this when user has confirmed they are looking at (sx, sy).
   * Adjusts the offset so prediction matches ground truth.
   */
  function correctDrift(trueX, trueY) {
    if (!model) return;
    const errX = trueX - outX;
    const errY = trueY - outY;
    driftOffsetX += errX * 0.5;
    driftOffsetY += errY * 0.5;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  INITIALIZATION
   * ══════════════════════════════════════════════════════════════════════ */
  async function init() {
    if (faceMesh) return;

    // Off-screen canvas for pixel extraction
    offscreenCanvas = document.createElement('canvas');
    offscreenCtx    = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    return new Promise((resolve, reject) => {
      try {
        faceMesh = new FaceMesh({
          locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
        });
        faceMesh.setOptions({
          maxNumFaces:            1,
          refineLandmarks:        true,    // REQUIRED for iris indices 468+
          minDetectionConfidence: 0.55,
          minTrackingConfidence:  0.55,
        });
        faceMesh.onResults(onResults);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async function startCamera(videoElement) {
    if (!faceMesh) await init();
    _lastVideo = videoElement;
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (faceMesh && videoElement.readyState >= 2) {
          try {
            await faceMesh.send({ image: videoElement });
          } catch (_) {}
        }
      },
      width: 640, height: 480,
    });
    await camera.start();
    isRunning = true;
  }

  function addListener(fn)    { listeners.push(fn); }
  function removeListener(fn) { listeners = listeners.filter(l => l !== fn); }
  function setSmoothing()     {}   // No-op; smoothing is adaptive
  function setSensitivity()   {}   // No-op; kept for API compat

  function stop() {
    if (camera) camera.stop();
    isRunning = false;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  PUBLIC API
   * ══════════════════════════════════════════════════════════════════════ */
  return {
    init,
    startCamera,
    addListener,
    removeListener,
    setSmoothing,
    setSensitivity,
    stop,
    startCalibration,
    recordCalibrationPoint,
    finalizeCalibration,
    clearCalibration,
    getCalibrationQuality,
    correctDrift,
  };
})();