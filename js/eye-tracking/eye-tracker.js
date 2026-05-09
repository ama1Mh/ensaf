// Eye tracking using MediaPipe Face Mesh (iris landmarks)
const EyeTracker = (() => {
  // Eye and iris landmarks
  const LEFT_IRIS = [468, 469, 470, 471, 472];  // Left iris landmarks
  const RIGHT_IRIS = [473, 474, 475, 476, 477, 478]; // Right iris landmarks
  const LEFT_EYE_CORNER = 33;   // Left eye outer corner
  const LEFT_EYE_INNER = 133;   // Left eye inner corner
  const RIGHT_EYE_CORNER = 263; // Right eye outer corner
  const RIGHT_EYE_INNER = 362;  // Right eye inner corner
  
  let faceMesh = null;
  let camera = null;
  let isRunning = false;
  let listeners = [];
  
  // Tracking state
  let smoothX = window.innerWidth / 2;
  let smoothY = window.innerHeight / 2;
  let confidence = 0;
  let isTracking = false;
  
  // Settings
  let sensitivityX = 3.5;
  let sensitivityY = 3.0;
  let smoothingAlpha = 0.15;
  
  async function init() {
    if (faceMesh) return;
    
    return new Promise((resolve, reject) => {
      faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,  // Must be true for iris landmarks!
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      
      faceMesh.onResults(onResults);
      resolve();
    });
  }
  
  function getIrisCenter(landmarks, irisIndices) {
    let sumX = 0, sumY = 0;
    let count = 0;
    for (const idx of irisIndices) {
      if (landmarks[idx]) {
        sumX += landmarks[idx].x;
        sumY += landmarks[idx].y;
        count++;
      }
    }
    if (count === 0) return null;
    return { x: sumX / count, y: sumY / count };
  }
  
  function getEyeCorners(landmarks, outerIdx, innerIdx) {
    return {
      outer: { x: landmarks[outerIdx].x, y: landmarks[outerIdx].y },
      inner: { x: landmarks[innerIdx].x, y: landmarks[innerIdx].y }
    };
  }
  
  function onResults(results) {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
      confidence = Math.max(0, confidence - 0.1);
      isTracking = confidence > 0.2;
      notifyListeners();
      return;
    }
    
    confidence = Math.min(1, confidence + 0.15);
    isTracking = true;
    
    const landmarks = results.multiFaceLandmarks[0];
    
    // Get iris centers
    const leftIris = getIrisCenter(landmarks, LEFT_IRIS);
    const rightIris = getIrisCenter(landmarks, RIGHT_IRIS);
    
    // Get eye corners
    const leftEye = getEyeCorners(landmarks, LEFT_EYE_CORNER, LEFT_EYE_INNER);
    const rightEye = getEyeCorners(landmarks, RIGHT_EYE_CORNER, RIGHT_EYE_INNER);
    
    if (!leftIris || !rightIris) {
      notifyListeners();
      return;
    }
    
    // Calculate normalized gaze position within each eye
    const leftEyeWidth = Math.abs(leftEye.inner.x - leftEye.outer.x);
    const rightEyeWidth = Math.abs(rightEye.inner.x - rightEye.outer.x);
    
    // Iris offset from inner corner (normalized 0-1)
    let leftGazeX = (leftIris.x - leftEye.inner.x) / leftEyeWidth;
    let rightGazeX = (rightIris.x - rightEye.inner.x) / rightEyeWidth;
    
    // Average both eyes for more stable tracking
    let gazeX = (leftGazeX + rightGazeX) / 2;
    
    // Y-axis (vertical) - relative to face
    const faceTop = landmarks[10].y;  // Forehead
    const faceBottom = landmarks[152].y; // Chin
    const faceHeight = faceBottom - faceTop;
    const gazeY = (leftIris.y - faceTop) / faceHeight;
    
    // Map to screen coordinates with sensitivity
    let mappedX = gazeX * sensitivityX;
    let mappedY = gazeY * sensitivityY;
    
    // Clamp and invert X (mirror for webcam)
    mappedX = 1 - Math.max(0, Math.min(1, mappedX));
    mappedY = Math.max(0, Math.min(1, mappedY));
    
    // Convert to screen pixels
    const rawX = mappedX * window.innerWidth;
    const rawY = mappedY * window.innerHeight;
    
    // Apply smoothing
    smoothX = smoothX * (1 - smoothingAlpha) + rawX * smoothingAlpha;
    smoothY = smoothY * (1 - smoothingAlpha) + rawY * smoothingAlpha;
    
    notifyListeners();
  }
  
  function notifyListeners() {
    listeners.forEach(listener => {
      listener(smoothX, smoothY, confidence, isTracking);
    });
  }
  
  async function startCamera(videoElement) {
    if (!faceMesh) await init();
    
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (faceMesh && videoElement && videoElement.readyState >= 2) {
          await faceMesh.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });
    
    await camera.start();
    isRunning = true;
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
    stop
  };
})();