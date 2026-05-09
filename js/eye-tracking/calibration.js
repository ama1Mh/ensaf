// Calibration system for eye tracking
const Calibration = (() => {
  let isActive = false;
  let currentPointIndex = 0;
  let points = [];
  let onCompleteCallback = null;
  let onCancelCallback = null;
  let overlay = null;
  let pointsContainer = null;
  let statusSpan = null;
  let progressFill = null;
  
  const CALIBRATION_POINTS = [
    {x: 0.1, y: 0.1},  // top-left
    {x: 0.5, y: 0.1},  // top-center
    {x: 0.9, y: 0.1},  // top-right
    {x: 0.1, y: 0.5},  // center-left
    {x: 0.5, y: 0.5},  // center
    {x: 0.9, y: 0.5},  // center-right
    {x: 0.1, y: 0.9},  // bottom-left
    {x: 0.5, y: 0.9},  // bottom-center
    {x: 0.9, y: 0.9}   // bottom-right
  ];
  
  function init() {
    overlay = document.getElementById('calibration-overlay');
    pointsContainer = document.getElementById('cal-points');
    statusSpan = document.getElementById('cal-status');
    progressFill = document.getElementById('cal-progress-fill');
    
    if (!overlay) {
      createCalibrationUI();
    }
  }
  
  function createCalibrationUI() {
    const div = document.createElement('div');
    div.id = 'calibration-overlay';
    div.innerHTML = `
      <div style="font-size:24px;font-weight:700;">🎯 معايرة تتبع العين</div>
      <div style="font-size:14px;color:var(--t2);text-align:center;max-width:400px;">
        انظر إلى كل نقطة وثبّت نظرك عليها حتى تختفي
      </div>
      <div class="cal-points" id="cal-points"></div>
      <div class="cal-status" id="cal-status">0 / 9 نقاط</div>
      <div class="cal-progress"><div class="cal-progress-fill" id="cal-progress-fill"></div></div>
      <button class="bout" id="cal-cancel" style="margin-top:10px;">إلغاء</button>
    `;
    document.body.appendChild(div);
    
    overlay = div;
    pointsContainer = div.querySelector('#cal-points');
    statusSpan = div.querySelector('#cal-status');
    progressFill = div.querySelector('#cal-progress-fill');
    
    document.getElementById('cal-cancel').addEventListener('click', () => cancel());
  }
  
  function start(onComplete, onCancel) {
    onCompleteCallback = onComplete;
    onCancelCallback = onCancel;
    
    points = CALIBRATION_POINTS.map(p => ({
      x: p.x * window.innerWidth,
      y: p.y * window.innerHeight
    }));
    
    currentPointIndex = 0;
    isActive = true;
    
    // Build visual points
    pointsContainer.innerHTML = points.map((_, i) => 
      `<div class="cal-point" data-idx="${i}"></div>`
    ).join('');
    
    overlay.classList.add('on');
    document.getElementById('cursor').classList.add('calibrating');
    
    calibrateNextPoint();
  }
  
  function calibrateNextPoint() {
    if (currentPointIndex >= points.length) {
      complete();
      return;
    }
    
    const point = points[currentPointIndex];
    statusSpan.textContent = `${currentPointIndex + 1} / ${points.length} نقاط`;
    progressFill.style.width = `${(currentPointIndex / points.length) * 100}%`;
    
    // Highlight current point
    document.querySelectorAll('.cal-point').forEach((el, i) => {
      el.style.opacity = i === currentPointIndex ? '1' : '0.3';
      el.style.transform = i === currentPointIndex ? 'scale(1.3)' : 'scale(1)';
    });
    
    // Create temporary visual point for user to look at
    const tempPoint = document.createElement('div');
    tempPoint.style.cssText = `
      position:fixed;
      left:${point.x - 20}px;
      top:${point.y - 20}px;
      width:40px;
      height:40px;
      border-radius:50%;
      background:radial-gradient(circle, #00f0ff, #6d28d9);
      box-shadow:0 0 30px #00f0ff;
      z-index:10001;
      pointer-events:none;
      animation: pulse 0.5s ease infinite;
    `;
    document.body.appendChild(tempPoint);
    
    // Wait 2 seconds for user to focus, then record calibration
    setTimeout(() => {
      tempPoint.remove();
      
      // Record calibration point with WebGazer
      if (typeof webgazer !== 'undefined') {
        webgazer.recordScreenPosition(point.x, point.y, 'click');
      }
      
      currentPointIndex++;
      calibrateNextPoint();
    }, 2000);
  }
  
  function complete() {
    isActive = false;
    overlay.classList.remove('on');
    document.getElementById('cursor').classList.remove('calibrating');
    
    if (onCompleteCallback) {
      onCompleteCallback(true);
    }
  }
  
  function cancel() {
    isActive = false;
    overlay.classList.remove('on');
    document.getElementById('cursor').classList.remove('calibrating');
    
    if (onCancelCallback) {
      onCancelCallback();
    }
  }
  
  function isRunning() {
    return isActive;
  }
  
  return { init, start, cancel, isRunning };
})();