// WebGazer initialization and management
const WebGazerManager = (() => {
  let isRunning = false;
  let isInitialized = false;
  let gazeListeners = [];
  let currentGaze = { x: window.innerWidth / 2, y: window.innerHeight / 2, confidence: 0 };
  
  async function init() {
    if (isInitialized) return;
    
    return new Promise((resolve, reject) => {
      if (typeof webgazer === 'undefined') {
        reject('WebGazer library not loaded');
        return;
      }
      
      webgazer.setRegression('ridge')
        .setTracker('clmtrackr')
        .setGazeListener((data, elapsedTime) => {
          if (!isRunning) return;
          
          if (data !== null) {
            currentGaze = {
              x: Math.max(0, Math.min(window.innerWidth, data.x)),
              y: Math.max(0, Math.min(window.innerHeight, data.y)),
              confidence: 0.85
            };
            
            // Notify all listeners
            gazeListeners.forEach(listener => {
              listener(currentGaze.x, currentGaze.y, currentGaze.confidence);
            });
          }
        })
        .begin();
      
      // Configure video preview
      webgazer.showVideoPreview(true);
      
      // Reposition video container after it's created
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
        }
      }, 1000);
      
      isInitialized = true;
      isRunning = true;
      resolve();
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
  
  return { init, start, stop, addListener, removeListener, getCurrentGaze, isTracking };
})();