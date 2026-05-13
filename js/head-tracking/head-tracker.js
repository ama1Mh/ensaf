// Head tracking using MediaPipe Face Mesh
const HeadTracker = (() => {
  // Face mesh landmarks
  const NOSE = 1;
  const FOREHEAD = 10;
  const CHIN = 152;
  const LEFT_CHEEK = 234;
  const RIGHT_CHEEK = 454;
  
  let faceMesh = null;
  let camera = null;
  let isRunning = false;
  let listeners = [];
  
  // Tracking state
  let rawX = 0.5;
  let rawY = 0.5;
  let smoothX = 0.5;
  let smoothY = 0.5;
  let confidence = 0;
  let isTracking = false;
  
  // Settings
  let sensitivityX = 2.8;
  let sensitivityY = 2.5;
  let smoothingAlpha = 0.10;
  
  async function init() {
    if (faceMesh) return;
    
    return new Promise((resolve, reject) => {
      faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      
      faceMesh.onResults(onResults);
      resolve();
    });
  }
  
  async function startCamera(videoElement) {
    if (!faceMesh) await init();
    
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (faceMesh && videoElement) {
          await faceMesh.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });
    
    await camera.start();
    isRunning = true;
  }
  
  function onResults(results) {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
      confidence = Math.max(0, confidence - 0.08);
      isTracking = confidence > 0.2;
      notifyListeners();
      return;
    }
    
    confidence = Math.min(1, confidence + 0.12);
    isTracking = true;
    
    const landmarks = results.multiFaceLandmarks[0];
    
    // Calculate face bounding box
    const leftX = landmarks[LEFT_CHEEK].x;
    const rightX = landmarks[RIGHT_CHEEK].x;
    const topY = landmarks[FOREHEAD].y;
    const bottomY = landmarks[CHIN].y;
    
    const faceCenterX = (leftX + rightX) / 2;
    const faceCenterY = (topY + bottomY) / 2;
    const faceWidth = Math.abs(rightX - leftX);
    const faceHeight = Math.abs(bottomY - topY);
    
    // Get nose position
    const noseX = landmarks[NOSE].x;
    const noseY = landmarks[NOSE].y;
    
    // Calculate offset relative to face center
    const offsetX = faceWidth > 0.01 ? (noseX - faceCenterX) / faceWidth : 0;
    const offsetY = faceHeight > 0.01 ? (noseY - faceCenterY) / faceHeight : 0;
    
    // Mirror X for webcam (negative because webcam is mirrored)
    const mappedX = 0.5 + (-offsetX) * sensitivityX;
    const mappedY = 0.5 + (offsetY) * sensitivityY;
    
    rawX = Math.max(0, Math.min(1, mappedX));
    rawY = Math.max(0, Math.min(1, mappedY));
    
    // Apply smoothing
    smoothX = smoothX * (1 - smoothingAlpha) + rawX * smoothingAlpha;
    smoothY = smoothY * (1 - smoothingAlpha) + rawY * smoothingAlpha;
    
    notifyListeners();
  }
  
  function notifyListeners() {
    const screenX = smoothX * window.innerWidth;
    const screenY = smoothY * window.innerHeight;
    
    listeners.forEach(listener => {
      listener(screenX, screenY, confidence, isTracking);
    });
  }
  
  function addListener(callback) {
    listeners.push(callback);
  }
  
  function removeListener(callback) {
    listeners = listeners.filter(l => l !== callback);
  }
  
  function setSensitivity(x, y) {
    sensitivityX = x;
    sensitivityY = y;
  }
  
  function setSmoothing(alpha) {
    smoothingAlpha = alpha;
  }
  
  function getTrackingState() {
    return {
      isTracking,
      confidence,
      position: { x: smoothX, y: smoothY }
    };
  }
  
  function stop() {
    if (camera) {
      camera.stop();
    }
    isRunning = false;
  }
  
  return {
    init,
    startCamera,
    addListener,
    removeListener,
    setSensitivity,
    setSmoothing,
    getTrackingState,
    stop
  };
})();