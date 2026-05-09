// Calibration system for eye tracking - Simplified
const Calibration = (() => {
  let isActive = false;
  let currentPointIndex = 0;
  let points = [];
  let onCompleteCallback = null;
  let onCancelCallback = null;
  let overlay = null;
  let statusSpan = null;
  let progressFill = null;
  let calibrationInterval = null;
  
  const CALIBRATION_POINTS = [
    {x: 0.15, y: 0.15},  // top-left
    {x: 0.5, y: 0.15},   // top-center
    {x: 0.85, y: 0.15},  // top-right
    {x: 0.15, y: 0.5},   // center-left
    {x: 0.5, y: 0.5},    // center
    {x: 0.85, y: 0.5},   // center-right
    {x: 0.15, y: 0.85},  // bottom-left
    {x: 0.5, y: 0.85},   // bottom-center
    {x: 0.85, y: 0.85}   // bottom-right
  ];
  
  function init() {
    overlay = document.getElementById('calibration-overlay');
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
      <div style="font-size:24px;font-weight:700;margin-bottom:10px;">🎯 معايرة تتبع العين</div>
      <div style="font-size:14px;color:var(--t2);text-align:center;max-width:400px;margin-bottom:20px;">
        انظر إلى كل نقطة وثبّت نظرك عليها
      </div>
      <div class="cal-points" id="cal-points" style="display:grid;grid-template-columns:repeat(3,1fr);gap:40px;width:80%;max-width:500px;margin:20px auto;">
        <!-- Points will be added here -->
      </div>
      <div class="cal-status" id="cal-status" style="font-size:14px;color:var(--t2);text-align:center;margin:10px;">0 / 9 نقاط</div>
      <div class="cal-progress" style="width:200px;height:4px;background:var(--c2);border-radius:2px;overflow:hidden;margin:10px auto;">
        <div class="cal-progress-fill" id="cal-progress-fill" style="height:100%;background:linear-gradient(90deg,var(--vi),var(--cy));width:0%;transition:width .3s;"></div>
      </div>
      <button class="bout" id="cal-cancel" style="margin-top:10px;padding:8px 20px;">إلغاء</button>
    `;
    document.body.appendChild(div);
    
    overlay = div;
    statusSpan = div.querySelector('#cal-status');
    progressFill = div.querySelector('#cal-progress-fill');
    
    const cancelBtn = div.querySelector('#cal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => cancel());
    }
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
    
    // Build visual points grid
    const pointsContainer = overlay.querySelector('#cal-points');
    if (pointsContainer) {
      pointsContainer.innerHTML = points.map((_, i) => `
        <div class="cal-point" data-idx="${i}" style="width:30px;height:30px;border-radius:50%;background:rgba(0,240,255,0.3);border:2px solid #00f0ff;margin:auto;transition:all .3s;cursor:pointer;"></div>
      `).join('');
    }
    
    overlay.classList.add('on');
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.classList.add('calibrating');
    
    // Start calibration process
    calibrateNextPoint();
  }
  
  function calibrateNextPoint() {
    if (currentPointIndex >= points.length) {
      complete();
      return;
    }
    
    const point = points[currentPointIndex];
    if (statusSpan) statusSpan.textContent = `${currentPointIndex + 1} / ${points.length} نقاط`;
    if (progressFill) progressFill.style.width = `${(currentPointIndex / points.length) * 100}%`;
    
    // Highlight current point
    const allPoints = overlay.querySelectorAll('.cal-point');
    allPoints.forEach((el, i) => {
      if (i === currentPointIndex) {
        el.style.transform = 'scale(1.5)';
        el.style.background = 'rgba(139,92,246,0.8)';
        el.style.boxShadow = '0 0 20px #8b5cf6';
      } else {
        el.style.transform = 'scale(1)';
        el.style.background = 'rgba(0,240,255,0.3)';
        el.style.boxShadow = 'none';
      }
    });
    
    // Create temporary visual point for user to look at
    const tempPoint = document.createElement('div');
    tempPoint.style.cssText = `
      position:fixed;
      left:${point.x - 25}px;
      top:${point.y - 25}px;
      width:50px;
      height:50px;
      border-radius:50%;
      background:radial-gradient(circle, #00f0ff, #6d28d9);
      box-shadow:0 0 30px #00f0ff;
      z-index:10001;
      pointer-events:none;
      animation: pulse 0.5s ease-in-out infinite;
    `;
    document.body.appendChild(tempPoint);
    
    // Show countdown
    let countdown = 2;
    const countdownText = document.createElement('div');
    countdownText.style.cssText = `
      position:fixed;
      left:${point.x - 15}px;
      top:${point.y - 40}px;
      font-size:24px;
      font-weight:bold;
      color:#00f0ff;
      z-index:10002;
      pointer-events:none;
    `;
    countdownText.textContent = countdown;
    document.body.appendChild(countdownText);
    
    // Countdown and calibrate
    if (calibrationInterval) clearInterval(calibrationInterval);
    calibrationInterval = setInterval(() => {
      countdown--;
      countdownText.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(calibrationInterval);
        tempPoint.remove();
        countdownText.remove();
        
        // Record calibration point with WebGazer
        if (typeof webgazer !== 'undefined' && webgazer) {
          webgazer.recordScreenPosition(point.x, point.y, 'click');
        }
        
        currentPointIndex++;
        calibrateNextPoint();
      }
    }, 1000);
  }
  
  function complete() {
    if (calibrationInterval) clearInterval(calibrationInterval);
    isActive = false;
    if (overlay) overlay.classList.remove('on');
    
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.classList.remove('calibrating');
    
    if (onCompleteCallback) {
      onCompleteCallback(true);
    }
  }
  
  function cancel() {
    if (calibrationInterval) clearInterval(calibrationInterval);
    isActive = false;
    if (overlay) overlay.classList.remove('on');
    
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.classList.remove('calibrating');
    
    if (onCancelCallback) {
      onCancelCallback();
    }
  }
  
  function isRunning() {
    return isActive;
  }
  
  return { init, start, cancel, isRunning };
})();