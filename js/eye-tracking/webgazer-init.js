// WebGazer initialization - Simplified version without face mesh dependency
const WebGazerManager = (() => {
  let isRunning = false;
  let isInitialized = false;
  let gazeListeners = [];
  let currentGaze = { x: window.innerWidth / 2, y: window.innerHeight / 2, confidence: 0 };
  let webgazerInstance = null;
  
  async function init() {
    if (isInitialized) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      if (typeof webgazer === 'undefined') {
        console.error('WebGazer library not loaded');
        reject('WebGazer library not loaded');
        return;
      }
      
      try {
        // Configure webgazer with minimal options to avoid face mesh
        webgazer.setRegression('ridge')
          .setTracker('clmtrackr')
          .showVideoPreview(true)
          .showPredictionPoints(false)
          .applyKalmanFilter(true);
        
        // Set up gaze listener
        webgazer.setGazeListener((data, elapsedTime) => {
          if (!isRunning) return;
          
          if (data !== null && data.x !== null && data.y !== null) {
            // Validate coordinates
            let x = Math.max(0, Math.min(window.innerWidth, data.x));
            let y = Math.max(0, Math.min(window.innerHeight, data.y));
            
            // Apply smoothing
            currentGaze = {
              x: currentGaze.x * 0.7 + x * 0.3,
              y: currentGaze.y * 0.7 + y * 0.3,
              confidence: 0.85
            };
            
            // Notify listeners
            gazeListeners.forEach(listener => {
              listener(currentGaze.x, currentGaze.y, currentGaze.confidence);
            });
          }
        });
        
        // Start webgazer
        webgazer.begin()
          .then(() => {
            console.log('WebGazer started successfully');
            
            // Hide webgazer's default UI elements
            setTimeout(() => {
              const videoContainer = document.querySelector('#webgazerVideoContainer');
              if (videoContainer) {
                videoContainer.style.position = 'fixed';
                videoContainer.style.bottom = '14px';
                videoContainer.style.left = '14px';
                videoContainer.style.width = '200px';
                videoContainer.style.height = '150px';
                videoContainer.style.borderRadius = '20px';
                videoContainer.style.border = '1.5px solid rgba(139,92,246,.3)';
                videoContainer.style.opacity = '0.7';
                videoContainer.style.zIndex = '801';
                videoContainer.style.overflow = 'hidden';
              }
              
              const faceFeedback = document.querySelector('#webgazerFaceFeedbackBox');
              if (faceFeedback) {
                faceFeedback.style.display = 'none';
              }
            }, 1000);
            
            isInitialized = true;
            isRunning = true;
            resolve();
          })
          .catch((err) => {
            console.error('WebGazer failed to start:', err);
            reject(err);
          });
          
      } catch (err) {
        console.error('Error initializing WebGazer:', err);
        reject(err);
      }
    });
  }
  
  function start() {
    isRunning = true;
  }
  
  function stop() {
    isRunning = false;
  }
  
  function addListener(callback) {
    gazeListeners.push(callback);
  }
  
  function removeListener(callback) {
    gazeListeners = gazeListeners.filter(l => l !== callback);
  }
  
  function getCurrentGaze() {
    return currentGaze;
  }
  
  function isTracking() {
    return isRunning && isInitialized;
  }
  
  // Clear calibration data
  function clearCalibration() {
    if (typeof webgazer !== 'undefined' && webgazer) {
      webgazer.clearData();
    }
  }
  
  return { 
    init, 
    start, 
    stop, 
    addListener, 
    removeListener, 
    getCurrentGaze, 
    isTracking,
    clearCalibration
  };
})();