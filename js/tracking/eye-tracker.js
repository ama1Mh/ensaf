/**
 * Eye Tracker - Iris-based gaze tracking using MediaPipe Face Mesh
 * Uses iris landmarks (468, 473) for precise gaze estimation
 */
class EyeTracker extends BaseTracker {
  constructor() {
    super();
    this.faceMesh = null;
    this.camera = null;
    this.smoothX = window.innerWidth / 2;
    this.smoothY = window.innerHeight / 2;
    this.frameCount = 0;
    this.lastLogTime = 0;
  }

  async init() {
    if (this.faceMesh) return;
    
    this.faceMesh = new FaceMesh({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    
    // NEED iris landmarks for eye tracking
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,  // CRITICAL: enables iris detection (468, 473)
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });
    
    this.faceMesh.onResults((results) => this._processResults(results));
    console.log('[EyeTracker] Initialized with iris detection');
  }

  async startCamera(videoElement) {
    await this.init();
    
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({ image: videoElement });
      },
      width: CONFIG.CAMERA.WIDTH,
      height: CONFIG.CAMERA.HEIGHT
    });
    
    await this.camera.start();
    console.log('[EyeTracker] Camera started');
  }

  _processResults(results) {
    this.frameCount++;
    
    // Log debug info every 60 frames (~2 seconds)
    const now = performance.now();
    const shouldLog = (now - this.lastLogTime) > 2000;
    
    if (!results.multiFaceLandmarks?.length) {
      this.confidence = Math.max(0, this.confidence - 0.08);
      this._emit(this.smoothX, this.smoothY, this.confidence, this.confidence > 0.3);
      if (shouldLog) {
        console.log('[EyeTracker] No face detected - confidence:', this.confidence.toFixed(2));
        this.lastLogTime = now;
      }
      return;
    }

    const lm = results.multiFaceLandmarks[0];
    const cfg = CONFIG.EYE_TRACKING.KEY_LANDMARKS;
    
    // Check if iris landmarks exist (they should with refineLandmarks: true)
    const leftIris = lm[cfg.LEFT_IRIS];   // 468
    const rightIris = lm[cfg.RIGHT_IRIS]; // 473
    
    if (!leftIris || !rightIris) {
      this.confidence = Math.max(0, this.confidence - 0.05);
      this._emit(this.smoothX, this.smoothY, this.confidence, false);
      if (shouldLog) {
        console.log('[EyeTracker] No iris landmarks - face detected but irises not found');
        this.lastLogTime = now;
      }
      return;
    }

    this.confidence = Math.min(1, this.confidence + 0.15);
    
    // Get eye corners for reference
    const leftOuter = lm[cfg.LEFT_EYE_OUTER];   // 33
    const leftInner = lm[cfg.LEFT_EYE_INNER];   // 133
    const rightOuter = lm[cfg.RIGHT_EYE_OUTER]; // 362
    const rightInner = lm[cfg.RIGHT_EYE_INNER]; // 263
    
    // Calculate eye dimensions and centers
    const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x);
    const rightEyeWidth = Math.abs(rightOuter.x - rightInner.x);
    const avgEyeWidth = (leftEyeWidth + rightEyeWidth) / 2;
    
    const leftEyeCX = (leftOuter.x + leftInner.x) / 2;
    const leftEyeCY = (leftOuter.y + leftInner.y) / 2;
    const rightEyeCX = (rightOuter.x + rightInner.x) / 2;
    const rightEyeCY = (rightOuter.y + rightInner.y) / 2;
    
    // Iris positions relative to eye centers
    const leftIrisOffsetX = (leftIris.x - leftEyeCX) / Math.max(leftEyeWidth, 0.01);
    const leftIrisOffsetY = (leftIris.y - leftEyeCY) / Math.max(leftEyeWidth, 0.01);
    const rightIrisOffsetX = (rightIris.x - rightEyeCX) / Math.max(rightEyeWidth, 0.01);
    const rightIrisOffsetY = (rightIris.y - rightEyeCY) / Math.max(rightEyeWidth, 0.01);
    
    // Average both eyes (more stable)
    const avgOffsetX = (leftIrisOffsetX + rightIrisOffsetX) / 2;
    const avgOffsetY = (leftIrisOffsetY + rightIrisOffsetY) / 2;
    
    // Iris offset range is typically ±0.15 from center.
    // Use configurable sensitivity and adapt to face scale and confidence.
    const appearanceScale = Math.min(
      1.25,
      Math.max(0.85, 0.08 / Math.max(avgEyeWidth, 0.01))
    );
    const confidenceScale = Math.min(
      1.2,
      Math.max(0.9, 1 + (this.confidence - 0.55) * 0.75)
    );

    const sensitivityX = CONFIG.EYE_TRACKING.SENSITIVITY.X * appearanceScale * confidenceScale;
    const sensitivityY = CONFIG.EYE_TRACKING.SENSITIVITY.Y * appearanceScale * confidenceScale;

    const rawX = 0.5 + avgOffsetX * sensitivityX;
    const rawY = 0.5 + avgOffsetY * sensitivityY;

    // Clamp to screen bounds with a small margin to keep the cursor within visible area.
    const clampedX = Math.max(0.04, Math.min(0.96, rawX));
    const clampedY = Math.max(0.04, Math.min(0.96, rawY));

    // Smooth with EMA based on tracking confidence.
    const alpha = this.confidence > CONFIG.EYE_TRACKING.CONFIDENCE_THRESHOLD ?
      CONFIG.EYE_TRACKING.SMOOTHING.FAST_EMA :
      CONFIG.EYE_TRACKING.SMOOTHING.SLOW_EMA;
    
    this.smoothX = this.smoothX * (1 - alpha) + clampedX * alpha;
    this.smoothY = this.smoothY * (1 - alpha) + clampedY * alpha;
    
    const screenX = this.smoothX * window.innerWidth;
    const screenY = this.smoothY * window.innerHeight;
    
    // Debug logging
    if (shouldLog) {
      console.log('[EyeTracker]', {
        frame: this.frameCount,
        confidence: this.confidence.toFixed(2),
        irisOffset: `x:${avgOffsetX.toFixed(3)} y:${avgOffsetY.toFixed(3)}`,
        screen: `x:${screenX.toFixed(0)} y:${screenY.toFixed(0)}`,
        eyeWidth: avgEyeWidth.toFixed(3)
      });
      this.lastLogTime = now;
    }
    
    this._emit(screenX, screenY, this.confidence, true);
  }
  
  /**
   * Reset tracker (for recalibration)
   */
  reset() {
    this.smoothX = window.innerWidth / 2;
    this.smoothY = window.innerHeight / 2;
    this.confidence = 0;
    console.log('[EyeTracker] Reset');
  }
}