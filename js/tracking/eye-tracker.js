class EyeTracker extends BaseTracker {
  constructor() {
    super();
    this.faceMesh = null;
    this.camera = null;
    this.smoothX = window.innerWidth / 2;
    this.smoothY = window.innerHeight / 2;
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
    if (!results.multiFaceLandmarks?.length) {
      this.confidence = Math.max(0, this.confidence - 0.08);
      this._emit(this.smoothX, this.smoothY, this.confidence, this.confidence > 0.3);
      return;
    }

    const lm = results.multiFaceLandmarks[0];
    const cfg = CONFIG.EYE_TRACKING.KEY_LANDMARKS;
    
    // Check if iris landmarks exist
    if (!lm[cfg.LEFT_IRIS] || !lm[cfg.RIGHT_IRIS]) {
      this.confidence = Math.max(0, this.confidence - 0.05);
      this._emit(this.smoothX, this.smoothY, this.confidence, false);
      return;
    }

    this.confidence = Math.min(1, this.confidence + 0.15);
    
    // Iris positions (normalized 0-1)
    const leftIris = lm[cfg.LEFT_IRIS];
    const rightIris = lm[cfg.RIGHT_IRIS];
    
    // Average both irises for stability
    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;
    
    // Eye corners for reference
    const leftOuter = lm[cfg.LEFT_EYE_OUTER];
    const leftInner = lm[cfg.LEFT_EYE_INNER];
    const rightOuter = lm[cfg.RIGHT_EYE_OUTER];
    const rightInner = lm[cfg.RIGHT_EYE_INNER];
    
    // Calculate eye centers
    const leftEyeCX = (leftOuter.x + leftInner.x) / 2;
    const leftEyeCY = (leftOuter.y + leftInner.y) / 2;
    const rightEyeCX = (rightOuter.x + rightInner.x) / 2;
    const rightEyeCY = (rightOuter.y + rightInner.y) / 2;
    const eyesCX = (leftEyeCX + rightEyeCX) / 2;
    const eyesCY = (leftEyeCY + rightEyeCY) / 2;
    
    // Gaze offset relative to eye center
    const gazeOffsetX = irisX - eyesCX;
    const gazeOffsetY = irisY - eyesCY;
    
    // Map to screen (iris movement is subtle, need amplification)
    const sensitivityX = 6.0;
    const sensitivityY = 5.0;
    
    const rawX = 0.5 + gazeOffsetX * sensitivityX;
    const rawY = 0.5 + gazeOffsetY * sensitivityY;
    
    // Smooth
    const alpha = this.confidence > 0.7 ? 
      CONFIG.EYE_TRACKING.SMOOTHING.FAST_EMA : 
      CONFIG.EYE_TRACKING.SMOOTHING.SLOW_EMA;
    
    this.smoothX = this.smoothX * (1 - alpha) + Math.max(0, Math.min(1, rawX)) * alpha;
    this.smoothY = this.smoothY * (1 - alpha) + Math.max(0, Math.min(1, rawY)) * alpha;
    
    const screenX = this.smoothX * window.innerWidth;
    const screenY = this.smoothY * window.innerHeight;
    
    this._emit(screenX, screenY, this.confidence, true);
  }
}