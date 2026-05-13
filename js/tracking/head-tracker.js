class HeadTracker extends BaseTracker {
  constructor() {
    super();
    this.faceMesh = null;
    this.camera = null;
    this.smoothX = 0.5;
    this.smoothY = 0.5;
  }

  async init() {
    if (this.faceMesh) return;
    
    this.faceMesh = new FaceMesh({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false, // Head-only, don't need iris
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });
    
    this.faceMesh.onResults((results) => this._processResults(results));
    console.log('[HeadTracker] Initialized');
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
    console.log('[HeadTracker] Camera started');
  }

  _processResults(results) {
    if (!results.multiFaceLandmarks?.length) {
      this.confidence = Math.max(0, this.confidence - 0.08);
      this._emit(this.x, this.y, this.confidence, this.confidence > 0.2);
      return;
    }

    this.confidence = Math.min(1, this.confidence + 0.12);
    const lm = results.multiFaceLandmarks[0];
    
    // Face geometry
    const cfg = CONFIG.HEAD_TRACKING.KEY_LANDMARKS;
    const faceCX = (lm[cfg.LEFT_CHEEK].x + lm[cfg.RIGHT_CHEEK].x) / 2;
    const faceCY = (lm[cfg.FOREHEAD].y + lm[cfg.CHIN].y) / 2;
    const faceW = Math.abs(lm[cfg.RIGHT_CHEEK].x - lm[cfg.LEFT_CHEEK].x);
    const faceH = Math.abs(lm[cfg.CHIN].y - lm[cfg.FOREHEAD].y);
    
    // Nose offset from face center
    const noseX = lm[cfg.NOSE_TIP].x;
    const noseY = lm[cfg.NOSE_TIP].y;
    
    const offsetX = faceW > 0.01 ? (noseX - faceCX) / faceW : 0;
    const offsetY = faceH > 0.01 ? (noseY - faceCY) / faceH : 0;
    
    // Map to screen coordinates
    const rawX = 0.5 + (-offsetX) * CONFIG.HEAD_TRACKING.SENSITIVITY_X;
    const rawY = 0.5 + offsetY * CONFIG.HEAD_TRACKING.SENSITIVITY_Y;
    
    // Smooth
    const alpha = CONFIG.HEAD_TRACKING.SMOOTHING_ALPHA;
    this.smoothX = this.smoothX * (1 - alpha) + Math.max(0, Math.min(1, rawX)) * alpha;
    this.smoothY = this.smoothY * (1 - alpha) + Math.max(0, Math.min(1, rawY)) * alpha;
    
    const screenX = this.smoothX * window.innerWidth;
    const screenY = this.smoothY * window.innerHeight;
    
    this._emit(screenX, screenY, this.confidence, true);
  }

  setSensitivity(x, y) {
    CONFIG.HEAD_TRACKING.SENSITIVITY_X = x;
    CONFIG.HEAD_TRACKING.SENSITIVITY_Y = y;
  }
}