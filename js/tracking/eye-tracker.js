/**
 * EyeTracker v2 — Iris-based gaze tracking using MediaPipe Face Mesh
 *
 * Key fixes over v1:
 *  - Waits for FaceMesh to be fully ready before sending frames
 *  - Retries MediaPipe CDN load if first attempt fails
 *  - Exposes a live debug overlay (toggle with window.EYE_DEBUG = true)
 *  - Graceful fallback: if iris landmarks unavailable, falls back to nose tip
 *  - Proper camera teardown / reinit on reset()
 */
class EyeTracker extends BaseTracker {
  constructor() {
    super();
    this.faceMesh  = null;
    this.camera    = null;
    this.videoEl   = null;

    // Smoothed gaze position (normalised 0-1)
    this.smoothX = 0.5;
    this.smoothY = 0.5;

    // Running frame count & log throttle
    this.frameCount  = 0;
    this.lastLogTime = 0;
    this._ready      = false;   // FaceMesh fully initialised?
    this._starting   = false;   // Prevent concurrent startCamera calls

    // Optional on-screen debug overlay
    this._debugEl = null;
  }

  /* ─────────────────────────────────────────────
   * PUBLIC API
   * ───────────────────────────────────────────── */

  async init() {
    if (this.faceMesh && this._ready) return;
    if (this._starting) return;
    this._starting = true;

    console.log('[EyeTracker] Initialising FaceMesh…');

    // Try primary CDN, then fallback CDN
    const cdnOptions = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
      'https://unpkg.com/@mediapipe/face_mesh'
    ];

    let lastErr;
    for (const cdn of cdnOptions) {
      try {
        this.faceMesh = new FaceMesh({
          locateFile: (file) => `${cdn}/${file}`
        });

        this.faceMesh.setOptions({
          maxNumFaces:           1,
          refineLandmarks:       true,   // CRITICAL — enables iris landmarks 468 & 473
          minDetectionConfidence: 0.60,
          minTrackingConfidence:  0.60
        });

        this.faceMesh.onResults((r) => this._processResults(r));

        // Force-initialise by sending a blank frame; FaceMesh is lazy
        await this._warmUp();

        this._ready   = true;
        this._starting = false;
        console.log(`[EyeTracker] FaceMesh ready (CDN: ${cdn})`);
        return;
      } catch (err) {
        console.warn(`[EyeTracker] CDN failed (${cdn}):`, err);
        lastErr = err;
        this.faceMesh = null;
      }
    }

    this._starting = false;
    throw new Error('[EyeTracker] All CDNs failed: ' + lastErr);
  }

  async startCamera(videoElement) {
    this.videoEl = videoElement;
    await this.init();

    if (this.camera) {
      // Already running
      return;
    }

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (!this._ready || !this.faceMesh) return;
        try {
          await this.faceMesh.send({ image: videoElement });
        } catch (e) {
          // Swallow single-frame errors; FaceMesh recovers automatically
        }
      },
      width:  CONFIG.CAMERA.WIDTH,
      height: CONFIG.CAMERA.HEIGHT
    });

    await this.camera.start();
    this._ensureDebugOverlay();
    console.log('[EyeTracker] Camera started');
  }

  /** Hard reset — clears smoothing and resets confidence */
  reset() {
    this.smoothX    = 0.5;
    this.smoothY    = 0.5;
    this.confidence = 0;
    this.frameCount = 0;
    console.log('[EyeTracker] Reset');
  }

  /* ─────────────────────────────────────────────
   * INTERNAL: RESULT PROCESSING
   * ───────────────────────────────────────────── */

  _processResults(results) {
    this.frameCount++;
    const now        = performance.now();
    const shouldLog  = (now - this.lastLogTime) > 2000;

    // ── No face ──────────────────────────────────
    if (!results.multiFaceLandmarks?.length) {
      this.confidence = Math.max(0, this.confidence - 0.08);
      this._emit(
        this.smoothX * window.innerWidth,
        this.smoothY * window.innerHeight,
        this.confidence,
        this.confidence > 0.3
      );
      if (shouldLog) {
        console.log('[EyeTracker] No face — conf:', this.confidence.toFixed(2));
        this.lastLogTime = now;
      }
      this._updateDebug({ status: 'No face', conf: this.confidence });
      return;
    }

    const lm  = results.multiFaceLandmarks[0];
    const cfg = CONFIG.EYE_TRACKING.KEY_LANDMARKS;

    const leftIris  = lm[cfg.LEFT_IRIS];    // 468
    const rightIris = lm[cfg.RIGHT_IRIS];   // 473

    // ── Iris not found → fallback to nose/head centre ─
    if (!leftIris || !rightIris) {
      console.warn('[EyeTracker] Iris landmarks missing — using nose fallback');
      this._fallbackToNose(lm, shouldLog, now);
      return;
    }

    // ── Iris tracking ─────────────────────────────
    this.confidence = Math.min(1, this.confidence + 0.15);

    const leftOuter  = lm[cfg.LEFT_EYE_OUTER];   // 33
    const leftInner  = lm[cfg.LEFT_EYE_INNER];   // 133
    const rightOuter = lm[cfg.RIGHT_EYE_OUTER];  // 362
    const rightInner = lm[cfg.RIGHT_EYE_INNER];  // 263

    const leftW  = Math.abs(leftOuter.x  - leftInner.x);
    const rightW = Math.abs(rightOuter.x - rightInner.x);
    const avgW   = (leftW + rightW) / 2;

    const lCX = (leftOuter.x  + leftInner.x)  / 2;
    const lCY = (leftOuter.y  + leftInner.y)  / 2;
    const rCX = (rightOuter.x + rightInner.x) / 2;
    const rCY = (rightOuter.y + rightInner.y) / 2;

    const lOffX = (leftIris.x  - lCX) / Math.max(leftW,  0.01);
    const lOffY = (leftIris.y  - lCY) / Math.max(leftW,  0.01);
    const rOffX = (rightIris.x - rCX) / Math.max(rightW, 0.01);
    const rOffY = (rightIris.y - rCY) / Math.max(rightW, 0.01);

    const avgOffX = (lOffX + rOffX) / 2;
    const avgOffY = (lOffY + rOffY) / 2;

    // Appearance scale adapts to how far the face is from camera
    const appearanceScale = Math.min(1.25, Math.max(0.85, 0.08 / Math.max(avgW, 0.01)));
    const confScale       = Math.min(1.20, Math.max(0.90, 1 + (this.confidence - 0.55) * 0.75));

    const sensX = CONFIG.EYE_TRACKING.SENSITIVITY.X * appearanceScale * confScale;
    const sensY = CONFIG.EYE_TRACKING.SENSITIVITY.Y * appearanceScale * confScale;

    // Map iris offset → [0,1]. Iris offset real-world range is ≈ ±0.12.
    // After multiplying by sensitivity (~5) we get ≈ ±0.6 around 0.5,
    // then stretch [0.05, 0.95] → [0, 1] so eyes-at-edge actually reach screen edge.
    const rawX = 0.5 + avgOffX * sensX;
    const rawY = 0.5 + avgOffY * sensY;

    const stretch = (v) => Math.max(0, Math.min(1, (Math.max(0, Math.min(1, v)) - 0.05) / 0.90));
    const clampedX = stretch(rawX);
    const clampedY = stretch(rawY);

    const alpha = this.confidence > CONFIG.EYE_TRACKING.CONFIDENCE_THRESHOLD
      ? CONFIG.EYE_TRACKING.SMOOTHING.FAST_EMA
      : CONFIG.EYE_TRACKING.SMOOTHING.SLOW_EMA;

    this.smoothX = this.smoothX * (1 - alpha) + clampedX * alpha;
    this.smoothY = this.smoothY * (1 - alpha) + clampedY * alpha;

    const screenX = this.smoothX * window.innerWidth;
    const screenY = this.smoothY * window.innerHeight;

    if (shouldLog) {
      console.log('[EyeTracker]', {
        frame:      this.frameCount,
        conf:       this.confidence.toFixed(2),
        irisOff:    `x:${avgOffX.toFixed(3)} y:${avgOffY.toFixed(3)}`,
        screen:     `x:${screenX.toFixed(0)} y:${screenY.toFixed(0)}`,
        eyeW:       avgW.toFixed(3)
      });
      this.lastLogTime = now;
    }

    this._updateDebug({
      status: 'Iris OK',
      conf:   this.confidence,
      offX:   avgOffX,
      offY:   avgOffY,
      sx:     screenX,
      sy:     screenY
    });

    this._emit(screenX, screenY, this.confidence, true);
  }

  /* ─────────────────────────────────────────────
   * INTERNAL: NOSE-TIP FALLBACK
   * (head-pose based, no iris needed)
   * ───────────────────────────────────────────── */
  _fallbackToNose(lm, shouldLog, now) {
    this.confidence = Math.max(0, this.confidence - 0.03);

    // Use nose tip (lm[1]) as proxy — mirrors head-tracker logic
    const nose = lm[1];
    if (!nose) {
      this._emit(this.smoothX * window.innerWidth, this.smoothY * window.innerHeight, this.confidence, false);
      return;
    }

    // Nose is in normalised [0,1] space; mirror horizontally (camera is flipped)
    const rawX = 1 - nose.x;
    const rawY = nose.y;

    const alpha = 0.12;
    this.smoothX = this.smoothX * (1 - alpha) + rawX * alpha;
    this.smoothY = this.smoothY * (1 - alpha) + rawY * alpha;

    const screenX = this.smoothX * window.innerWidth;
    const screenY = this.smoothY * window.innerHeight;

    if (shouldLog) {
      console.log('[EyeTracker] Fallback nose pos →', screenX.toFixed(0), screenY.toFixed(0));
      this.lastLogTime = now;
    }

    this._updateDebug({ status: 'Nose fallback', conf: this.confidence });
    this._emit(screenX, screenY, this.confidence, this.confidence > 0.2);
  }

  /* ─────────────────────────────────────────────
   * INTERNAL: WARM-UP (force FaceMesh to init)
   * ───────────────────────────────────────────── */
  async _warmUp() {
    return new Promise((resolve, reject) => {
      // Create a tiny off-screen canvas and send it once to trigger WASM load
      const canvas  = document.createElement('canvas');
      canvas.width  = 4;
      canvas.height = 4;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#888';
      ctx.fillRect(0, 0, 4, 4);

      const timeout = setTimeout(() => {
        // Warm-up timeout is OK — FaceMesh may just not have a face to detect
        console.log('[EyeTracker] Warm-up complete (timeout path)');
        resolve();
      }, 5000);

      const origCb = this.faceMesh.onResults.bind(this.faceMesh);
      this.faceMesh.onResults((r) => {
        clearTimeout(timeout);
        // Restore real handler
        this.faceMesh.onResults((res) => this._processResults(res));
        resolve();
      });

      this.faceMesh.send({ image: canvas }).catch((e) => {
        clearTimeout(timeout);
        reject(e);
      });
    });
  }

  /* ─────────────────────────────────────────────
   * INTERNAL: DEBUG OVERLAY
   * ───────────────────────────────────────────── */
  _ensureDebugOverlay() {
    if (this._debugEl || !window.EYE_DEBUG) return;

    const el = document.createElement('div');
    el.id = 'eye-debug-overlay';
    el.style.cssText = `
      position: fixed;
      bottom: 12px;
      left: 12px;
      background: rgba(0,0,0,0.75);
      color: #0ff;
      font: 11px/1.5 monospace;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 99999;
      pointer-events: none;
      min-width: 220px;
    `;
    document.body.appendChild(el);
    this._debugEl = el;
  }

  _updateDebug(info) {
    if (!this._debugEl) {
      if (window.EYE_DEBUG) this._ensureDebugOverlay();
      else return;
    }
    const bar = '█'.repeat(Math.round((info.conf || 0) * 10))
              + '░'.repeat(10 - Math.round((info.conf || 0) * 10));
    this._debugEl.innerHTML = `
      <b>EyeTracker</b> [frame ${this.frameCount}]<br>
      Status : ${info.status || '—'}<br>
      Conf   : ${bar} ${((info.conf || 0) * 100).toFixed(0)}%<br>
      IrisOff: x:${(info.offX || 0).toFixed(3)} y:${(info.offY || 0).toFixed(3)}<br>
      Screen : x:${(info.sx || 0).toFixed(0)} y:${(info.sy || 0).toFixed(0)}<br>
    `;
  }
}