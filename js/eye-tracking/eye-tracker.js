/**
 * ENSAF EyeTracker v4 — TensorFlow.js CNN + On-Device Training
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE CHANGE FROM v3:
 * ─────────────────────────────────────────────────────────────────────────
 * v3: MediaPipe raw WASM + pixel patch + kernel ridge regression
 * v4: TensorFlow.js (WebGL backend) + face-landmarks-detection model +
 *     a tiny CNN trained live on the user's own eye crops → screen coords
 *
 * WHY CNN BEATS RIDGE REGRESSION FOR THIS TASK:
 *   • Ridge regression on flattened pixels is blind to spatial structure.
 *     A conv layer learns WHERE in the eye patch to look (the iris edge,
 *     the pupil reflection, the limbus) — features ridge regression can't
 *     discover from flattened vectors.
 *   • With WebGL, inference on a tiny CNN (~50K params) runs in <2 ms,
 *     leaving plenty of budget for the face detector.
 *   • On-device training (tf.model.fit) adjusts weights to YOUR face,
 *     YOUR webcam, YOUR lighting — no pre-trained gaze model needed.
 *   • TF.js memory management (tf.tidy) prevents GPU memory leaks that
 *     plague long eye-tracking sessions.
 *
 * PIPELINE:
 *   webcam → TF.js face-landmarks-detection (478 pts, iris refined)
 *         → crop left & right eye patches (48×24 px, normalised)
 *         → CNN: [conv → pool → conv → pool → flatten → dense(128) → dense(2)]
 *         → (screenX, screenY) prediction
 *         → adaptive Kalman-EMA smoother
 *         → listeners notified
 *
 * CALIBRATION:
 *   16-point grid → for each point record N eye-crop tensors + screen coords
 *   → train CNN for 30 epochs on-device (takes ~1-2 s on most hardware)
 *   → model locked, inference begins
 *
 * SAME PUBLIC API as v2/v3 — drop-in replacement.
 *
 * HTML dependencies (add to <head> BEFORE this script):
 *   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.6/dist/face-landmarks-detection.js"></script>
 */

const EyeTracker = (() => {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════
   *  LANDMARK INDICES  (TF.js face-landmarks-detection, 478 points)
   *  Same numbering as MediaPipe FaceMesh with refineLandmarks:true
   * ═══════════════════════════════════════════════════════════════════════ */
  // Iris centres (indices 468-477, 5 pts per eye)
  const L_IRIS  = [468, 469, 470, 471, 472];
  const R_IRIS  = [473, 474, 475, 476, 477];
  // Eye corners
  const L_OUTER = 33;  const L_INNER = 133;
  const R_OUTER = 263; const R_INNER = 362;
  // Lids
  const L_TOP   = 159; const L_BOT   = 145;
  const R_TOP   = 386; const R_BOT   = 374;

  /* ═══════════════════════════════════════════════════════════════════════
   *  CONFIGURATION
   * ═══════════════════════════════════════════════════════════════════════ */
  const EYE_W         = 48;    // eye patch width (px)
  const EYE_H         = 24;    // eye patch height (px)
  const EPOCHS        = 40;    // CNN training epochs per calibration
  const BATCH_SIZE    = 8;
  const BLINK_EAR     = 0.17;  // EAR threshold for blink
  const BLINK_FRAMES  = 3;
  const EMA_ALPHA_LO  = 0.10;  // slow smoothing (low conf)
  const EMA_ALPHA_HI  = 0.30;  // fast smoothing (high conf)

  /* ═══════════════════════════════════════════════════════════════════════
   *  STATE
   * ═══════════════════════════════════════════════════════════════════════ */
  let detector      = null;    // TF.js face detector
  let gazeModel     = null;    // our tiny CNN
  let videoEl       = null;
  let rafId         = null;    // requestAnimationFrame handle
  let isRunning     = false;
  let listeners     = [];

  // Calibration data: { leftPatch: Float32Array, rightPatch: Float32Array, sx, sy }[]
  let calibData     = [];

  // Smoother state
  let smoothX = null;
  let smoothY = null;
  let conf    = 0;

  // Blink detector
  let blinkCount = 0;

  // Off-screen canvas pool for crop extraction
  let cropCanvas  = null;
  let cropCtx     = null;

  /* ═══════════════════════════════════════════════════════════════════════
   *  CNN MODEL DEFINITION
   *
   *  Input: [batch, EYE_H, EYE_W*2, 1]  — left and right eye patches
   *         concatenated side-by-side, single greyscale channel.
   *  Output: [batch, 2]  — (screenX, screenY) in pixels
   *
   *  We keep it tiny on purpose: 16-point calibration gives only ~160
   *  training samples (16 pts × 10 crops). A bigger model would overfit.
   * ═══════════════════════════════════════════════════════════════════════ */
  function buildGazeModel() {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const inputW = EYE_W * 2;  // both eyes side-by-side

    const inp = tf.input({ shape: [EYE_H, inputW, 1], name: 'eye_input' });

    // Block 1 — detect iris edges and reflections
    let x = tf.layers.conv2d({
      filters: 16, kernelSize: 3, padding: 'same', activation: 'relu',
      kernelInitializer: 'heNormal', name: 'conv1'
    }).apply(inp);
    x = tf.layers.batchNormalization({ name: 'bn1' }).apply(x);
    x = tf.layers.maxPooling2d({ poolSize: 2, name: 'pool1' }).apply(x);

    // Block 2 — higher-level gaze features
    x = tf.layers.conv2d({
      filters: 32, kernelSize: 3, padding: 'same', activation: 'relu',
      kernelInitializer: 'heNormal', name: 'conv2'
    }).apply(x);
    x = tf.layers.batchNormalization({ name: 'bn2' }).apply(x);
    x = tf.layers.maxPooling2d({ poolSize: 2, name: 'pool2' }).apply(x);

    // Block 3 — spatial compression
    x = tf.layers.conv2d({
      filters: 32, kernelSize: 3, padding: 'same', activation: 'relu',
      kernelInitializer: 'heNormal', name: 'conv3'
    }).apply(x);
    x = tf.layers.globalAveragePooling2d({ name: 'gap' }).apply(x);

    // Dense head
    x = tf.layers.dense({ units: 64, activation: 'relu',
      kernelInitializer: 'heNormal', name: 'fc1' }).apply(x);
    x = tf.layers.dropout({ rate: 0.3, name: 'drop' }).apply(x);

    // Output: raw pixel coordinates; tanh scaled to screen
    const out = tf.layers.dense({
      units: 2, activation: 'tanh',
      kernelInitializer: 'glorotNormal', name: 'gaze_out'
    }).apply(x);

    const model = tf.model({ inputs: inp, outputs: out, name: 'GazeNet' });

    // We'll post-multiply tanh output by screen half-dims + add centre offset
    model._screenW = W;
    model._screenH = H;

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    return model;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  EYE CROP EXTRACTION
   *  Returns a Float32Array of shape [EYE_H × EYE_W] normalised 0..1
   * ═══════════════════════════════════════════════════════════════════════ */
  function cropEye(kp, outerIdx, innerIdx, topIdx, botIdx, video) {
    if (!cropCtx || !video || video.readyState < 2) return null;

    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;

    const ox = kp[outerIdx].x, ix = kp[innerIdx].x;
    const ty = kp[topIdx].y,   by = kp[botIdx].y;

    const padX = Math.abs(ix - ox) * 0.3;
    const padY = Math.abs(by - ty) * 0.5;

    const x1 = (Math.min(ox, ix) - padX) * vw;
    const y1 = (ty - padY) * vh;
    const pw = (Math.abs(ix - ox) + padX * 2) * vw;
    const ph = (Math.abs(by - ty) + padY * 2) * vh;

    if (pw < 4 || ph < 4) return null;

    cropCanvas.width  = EYE_W;
    cropCanvas.height = EYE_H;
    try {
      cropCtx.drawImage(video, x1, y1, pw, ph, 0, 0, EYE_W, EYE_H);
    } catch (_) { return null; }

    const px   = cropCtx.getImageData(0, 0, EYE_W, EYE_H).data;
    const out  = new Float32Array(EYE_H * EYE_W);
    for (let i = 0; i < out.length; i++)
      out[i] = (px[i*4]*0.299 + px[i*4+1]*0.587 + px[i*4+2]*0.114) / 255;
    return out;
  }

  /**
   * Combine left + right crops into a single [EYE_H, EYE_W*2, 1] tensor.
   */
  function makePatchTensor(left, right) {
    const combined = new Float32Array(EYE_H * EYE_W * 2);
    for (let r = 0; r < EYE_H; r++) {
      // left eye row
      combined.set(left.subarray(r * EYE_W, (r+1) * EYE_W), r * EYE_W * 2);
      // right eye row
      combined.set(right.subarray(r * EYE_W, (r+1) * EYE_W), r * EYE_W * 2 + EYE_W);
    }
    return tf.tensor4d(combined, [1, EYE_H, EYE_W * 2, 1]);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  EAR  (Eye Aspect Ratio) — blink detection
   * ═══════════════════════════════════════════════════════════════════════ */
  function computeEAR(kp) {
    const earOne = (top, bot, outer, inner) => {
      const h = Math.abs(kp[top].y  - kp[bot].y);
      const w = Math.abs(kp[outer].x - kp[inner].x);
      return w > 0 ? h / w : 0;
    };
    return (earOne(L_TOP, L_BOT, L_OUTER, L_INNER) +
            earOne(R_TOP, R_BOT, R_OUTER, R_INNER)) / 2;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  SCREEN COORDINATE DECODE
   *  CNN outputs tanh ∈ (-1,1). We map:
   *    x: -1 → 0px,  +1 → screenWidth
   *    y: -1 → 0px,  +1 → screenHeight
   * ═══════════════════════════════════════════════════════════════════════ */
  function decodeCoords(rawX, rawY) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    return {
      sx: (rawX + 1) / 2 * W,
      sy: (rawY + 1) / 2 * H,
    };
  }

  /**
   * Encode screen (sx, sy) → tanh target for training.
   */
  function encodeTarget(sx, sy) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    return [
      sx / W * 2 - 1,
      sy / H * 2 - 1,
    ];
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  ADAPTIVE EMA SMOOTHER
   * ═══════════════════════════════════════════════════════════════════════ */
  function smooth(nx, ny) {
    if (smoothX === null) { smoothX = nx; smoothY = ny; return; }
    const dist = Math.hypot(nx - smoothX, ny - smoothY);
    const diag = Math.hypot(window.innerWidth, window.innerHeight);
    const speed = Math.min(1, dist / (diag * 0.12));
    const alpha = EMA_ALPHA_LO + (EMA_ALPHA_HI - EMA_ALPHA_LO) * conf * (0.3 + speed * 0.7);
    smoothX += alpha * (nx - smoothX);
    smoothY += alpha * (ny - smoothY);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  MAIN INFERENCE LOOP
   * ═══════════════════════════════════════════════════════════════════════ */
  let _lastLeft  = null;  // cached crops for calibration capture
  let _lastRight = null;

  async function inferenceLoop() {
    if (!isRunning || !detector || !videoEl) { rafId = null; return; }

    rafId = requestAnimationFrame(inferenceLoop);

    if (videoEl.readyState < 2) return;

    let faces;
    try {
      faces = await detector.estimateFaces(videoEl, { flipHorizontal: false });
    } catch (_) { return; }

    if (!faces || faces.length === 0) {
      conf = Math.max(0, conf - 0.1);
      emit();
      return;
    }

    const kp = faces[0].keypoints;

    // Blink
    const ear = computeEAR(kp);
    blinkCount = ear < BLINK_EAR ? blinkCount + 1 : 0;
    const isBlink = blinkCount >= BLINK_FRAMES;
    const targetConf = isBlink ? 0 : Math.min(1, ear / 0.28);
    conf = conf * 0.88 + targetConf * 0.12;

    if (isBlink) { emit(); return; }

    // Extract eye crops
    const lCrop = cropEye(kp, L_OUTER, L_INNER, L_TOP, L_BOT, videoEl);
    const rCrop = cropEye(kp, R_INNER, R_OUTER, R_TOP, R_BOT, videoEl);
    if (!lCrop || !rCrop) { emit(); return; }

    // Stash for calibration
    _lastLeft  = lCrop;
    _lastRight = rCrop;

    // Predict if model is trained
    if (gazeModel) {
      const [rawX, rawY] = tf.tidy(() => {
        const tensor = makePatchTensor(lCrop, rCrop);
        const pred   = gazeModel.predict(tensor);
        return pred.dataSync();
      });
      const { sx, sy } = decodeCoords(rawX, rawY);
      const cx = Math.max(0, Math.min(window.innerWidth,  sx));
      const cy = Math.max(0, Math.min(window.innerHeight, sy));
      smooth(cx, cy);
    }

    emit();
  }

  function emit() {
    const tracking = conf > 0.18;
    listeners.forEach(fn => fn(
      smoothX ?? window.innerWidth  / 2,
      smoothY ?? window.innerHeight / 2,
      conf,
      tracking
    ));
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  CALIBRATION
   * ═══════════════════════════════════════════════════════════════════════ */

  function startCalibration() {
    calibData  = [];
    gazeModel  = null;
    smoothX    = null;
    smoothY    = null;
  }

  /**
   * Collect `frames` gaze samples while user looks at (sx, sy).
   * Returns Promise that resolves when collection is done.
   */
  function recordCalibrationPoint(sx, sy, frames = 30) {
    return new Promise(resolve => {
      let captured = 0;

      const tick = () => {
        if (!isRunning) { resolve(); return; }
        if (conf < 0.3 || !_lastLeft || !_lastRight) {
          requestAnimationFrame(tick);
          return;
        }
        // Store a copy of the current crops
        calibData.push({
          left:  Float32Array.from(_lastLeft),
          right: Float32Array.from(_lastRight),
          sx, sy,
        });
        captured++;
        if (captured >= frames) {
          resolve();
        } else {
          // Small gap between frames to get distinct samples
          setTimeout(() => requestAnimationFrame(tick), 40);
        }
      };

      requestAnimationFrame(tick);
    });
  }

  /**
   * Train the CNN on collected calibration data.
   * Returns true on success.
   *
   * @param {function} [onProgress] - called with { epoch, loss } each epoch
   */
  async function finalizeCalibration(onProgress) {
    if (calibData.length < 6) {
      console.warn('EyeTracker: not enough calibration data');
      return false;
    }

    // Build model fresh for this user
    if (gazeModel) { gazeModel.dispose(); gazeModel = null; }
    gazeModel = buildGazeModel();

    // --- Build training tensors ---
    const N = calibData.length;
    const patchW = EYE_W * 2;

    // Pre-allocate
    const xBuf = new Float32Array(N * EYE_H * patchW);
    const yBuf = new Float32Array(N * 2);

    for (let i = 0; i < N; i++) {
      const { left, right, sx, sy } = calibData[i];
      // Interleave left+right rows
      for (let r = 0; r < EYE_H; r++) {
        xBuf.set(left.subarray(r*EYE_W, (r+1)*EYE_W), i * EYE_H * patchW + r * patchW);
        xBuf.set(right.subarray(r*EYE_W, (r+1)*EYE_W), i * EYE_H * patchW + r * patchW + EYE_W);
      }
      const [tx, ty] = encodeTarget(sx, sy);
      yBuf[i*2]   = tx;
      yBuf[i*2+1] = ty;
    }

    const xs = tf.tensor4d(xBuf, [N, EYE_H, patchW, 1]);
    const ys = tf.tensor2d(yBuf, [N, 2]);

    let success = false;
    try {
      await gazeModel.fit(xs, ys, {
        epochs:          EPOCHS,
        batchSize:       BATCH_SIZE,
        shuffle:         true,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (onProgress) onProgress({ epoch, loss: logs.loss });
          },
        },
      });
      success = true;
    } catch (err) {
      console.error('EyeTracker: CNN training failed', err);
      gazeModel.dispose();
      gazeModel = null;
    } finally {
      xs.dispose();
      ys.dispose();
    }

    // Reset smoother so first post-calibration frame starts fresh
    smoothX = null;
    smoothY = null;

    return success;
  }

  function clearCalibration() {
    if (gazeModel) { gazeModel.dispose(); gazeModel = null; }
    calibData = [];
    smoothX   = null;
    smoothY   = null;
  }

  function getCalibrationQuality() {
    // 16 points × 30 frames = 480 ideal samples; anything above 4 pts is useful
    const pts = new Set(calibData.map(d => `${Math.round(d.sx)},${Math.round(d.sy)}`)).size;
    return Math.min(1, pts / 16);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   *  INITIALIZATION
   * ═══════════════════════════════════════════════════════════════════════ */
  async function init() {
    if (detector) return;

    // Ensure TF.js is using WebGL for speed
    if (typeof tf === 'undefined') {
      throw new Error('TensorFlow.js not loaded. Add tf.min.js before this script.');
    }
    if (typeof faceLandmarksDetection === 'undefined') {
      throw new Error('@tensorflow-models/face-landmarks-detection not loaded.');
    }

    await tf.setBackend('webgl');
    await tf.ready();

    // Off-screen canvas for pixel extraction
    cropCanvas = document.createElement('canvas');
    cropCtx    = cropCanvas.getContext('2d', { willReadFrequently: true });

    // Create TF.js face detector
    // runtime:'tfjs' uses WebGL — no WASM, no CDN fetch of MediaPipe binaries
    const model  = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    detector = await faceLandmarksDetection.createDetector(model, {
      runtime:          'tfjs',        // <-- pure TensorFlow.js WebGL, no WASM
      refineLandmarks:  true,          // enables iris indices 468-477
      maxFaces:         1,
    });

    console.log('EyeTracker v4: TF.js detector ready. Backend:', tf.getBackend());
  }

  async function startCamera(videoElement) {
    if (!detector) await init();
    videoEl    = videoElement;
    isRunning  = true;
    smoothX    = null;
    smoothY    = null;
    inferenceLoop();
  }

  function addListener(fn)    { listeners.push(fn); }
  function removeListener(fn) { listeners = listeners.filter(l => l !== fn); }

  function stop() {
    isRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (gazeModel) { gazeModel.dispose(); gazeModel = null; }
    if (detector)  { detector.dispose?.(); detector  = null; }
  }

  // No-op shims for API compatibility
  function setSmoothing()  {}
  function setSensitivity() {}

  /* ═══════════════════════════════════════════════════════════════════════
   *  PUBLIC API
   * ═══════════════════════════════════════════════════════════════════════ */
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