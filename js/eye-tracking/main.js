// Main application logic for eye tracking version
const EyeTrackingApp = (() => {
  // State
  let currentScreen = 'welcome';
  let currentSubject = null;
  let currentQuestions = [];
  let currentQuestionIndex = 0;
  let currentScore = 0;
  let currentHesitations = 0;
  let startTime = 0;
  let dwell = null;
  let hesitationTimeout = null;
  let currentGazeX = window.innerWidth / 2;
  let currentGazeY = window.innerHeight / 2;
  
  // DOM Elements
  let screens = {};
  let cursor = null;
  let statusDot = null;
  let statusText = null;
  let confidenceFill = null;
  
  function init() {
    // Cache DOM elements
    cursor = document.getElementById('cursor');
    statusDot = document.getElementById('bdot');
    statusText = document.getElementById('bst');
    confidenceFill = document.getElementById('cff');
    
    screens = {
      welcome: document.getElementById('sw'),
      permission: document.getElementById('sp'),
      subjects: document.getElementById('ss'),
      question: document.getElementById('sq'),
      result: document.getElementById('sr')
    };
    
    // Initialize voice
    Voice.init();
    
    // Setup WebGazer
    WebGazerManager.addListener(onGaze);
    
    // Setup event listeners
    document.getElementById('calib-btn')?.addEventListener('click', () => startCalibration());
    document.getElementById('dm')?.addEventListener('click', () => adjustDwellTime(-500));
    document.getElementById('dp')?.addEventListener('click', () => adjustDwellTime(500));
    
    // Hide loading screen
    setTimeout(() => {
      const loader = document.getElementById('load');
      if (loader) loader.classList.add('out');
    }, 1600);
    
    // Initialize calibration UI
    Calibration.init();
  }
  
  function onGaze(x, y, confidence) {
    currentGazeX = x;
    currentGazeY = y;
    
    // Update cursor position
    if (cursor) {
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    }
    
    // Update status bar
    if (confidenceFill) {
      confidenceFill.style.width = (confidence * 100) + '%';
    }
    
    if (confidence > 0.6) {
      if (statusDot) statusDot.className = 'dot ok';
      if (statusText) statusText.textContent = 'تتبع العين نشط';
    } else if (confidence > 0.3) {
      if (statusDot) statusDot.className = 'dot wn';
      if (statusText) statusText.textContent = 'تتبع غير مستقر';
    } else {
      if (statusDot) statusDot.className = 'dot';
      if (statusText) statusText.textContent = 'جاري التهيئة...';
    }
    
    // Update dwell selection
    if (dwell) {
      dwell.update(x, y);
    }
  }
  
  function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.remove('on');
    });
    
    if (screens[screenId]) {
      screens[screenId].classList.add('on');
      currentScreen = screenId;
    }
  }
  
  async function start() {
    showScreen('permission');
  }
  
  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      const video = document.getElementById('vcam');
      if (video) {
        video.srcObject = stream;
        video.classList.add('show');
      }
      
      // Show UI elements
      document.getElementById('bar')?.classList.add('show');
      document.getElementById('vi')?.style.display = 'flex';
      if (cursor) cursor.classList.add('on');
      
      // Initialize WebGazer
      await WebGazerManager.init();
      WebGazerManager.start();
      
      Voice.speak('تم تفعيل تتبع العين. يرجى إجراء المعايرة للحصول على أفضل دقة.');
      
      // Ask for calibration
      setTimeout(async () => {
        const shouldCalibrate = confirm('هل تريد إجراء معايرة للعين الآن؟ (يوصى بها للحصول على أفضل دقة)');
        if (shouldCalibrate) {
          await startCalibration();
        }
        showSubjects();
      }, 1500);
      
    } catch (error) {
      console.error('Camera error:', error);
      alert('فشل الوصول للكاميرا. تأكد من منح الإذن.');
    }
  }
  
  function showSubjects() {
    showScreen('subjects');
    buildSubjectsGrid();
    Voice.speak('اختر مادة دراسية. انظر إلى البطاقة وثبّت نظرك للاختيار.');
  }
  
  function buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid) return;
    
    grid.innerHTML = DB.subjects.map(subject => `
      <div class="scard" data-id="${subject.id}">
        <div class="sem">${subject.emoji}</div>
        <div class="snm">${subject.name}</div>
        <div class="sct">5 أسئلة</div>
      </div>
    `).join('');
    
    const cards = Array.from(grid.querySelectorAll('.scard'));
    
    // Initialize dwell for subject selection
    if (dwell) dwell.destroy();
    dwell = new Dwell(
      (id) => selectSubject(id),
      (id, progress, active) => {
        const card = grid.querySelector(`[data-id="${id}"]`);
        if (card) {
          if (active && progress < 1) {
            card.classList.add('gz');
          } else {
            card.classList.remove('gz');
          }
        }
      }
    );
    
    dwell.setItems(cards.map(card => ({
      id: card.dataset.id,
      element: card
    })));
  }
  
  function selectSubject(subjectId) {
    currentSubject = subjectId;
    if (dwell) dwell.destroy();
    
    // Load questions
    currentQuestions = DB.getQuestions(subjectId);
    currentQuestionIndex = 0;
    currentScore = 0;
    currentHesitations = 0;
    startTime = Date.now();
    
    const subject = DB.getSubject(subjectId);
    Voice.speak(`لقد اخترت ${subject.name}. سيبدأ الاختبار الآن.`);
    
    setTimeout(() => showQuestion(), 500);
  }
  
  function showQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
      showResult();
      return;
    }
    
    showScreen('question');
    hideHint();
    
    const question = currentQuestions[currentQuestionIndex];
    const subject = DB.getSubject(currentSubject);
    const total = currentQuestions.length;
    
    // Update UI
    document.getElementById('qc').textContent = `السؤال ${currentQuestionIndex + 1} من ${total}`;
    document.getElementById('qpf').style.width = `${(currentQuestionIndex / total) * 100}%`;
    document.getElementById('qpts').textContent = `⭐ ${currentScore}`;
    document.getElementById('qtag').innerHTML = `${subject.emoji} ${subject.name}`;
    document.getElementById('qtxt').textContent = question.q;
    
    // Build answers grid
    const answersGrid = document.getElementById('agrid');
    const letters = ['أ', 'ب', 'ج', 'د'];
    answersGrid.innerHTML = question.opts.map((opt, i) => `
      <div class="abtn" data-index="${i}">
        <div class="altr">${letters[i]}</div>
        <div class="atxt">${opt}</div>
        <div class="adw"><div class="adwf" id="progress-${i}"></div></div>
      </div>
    `).join('');
    
    Voice.speak(question.q);
    
    // Setup dwell for answers
    if (dwell) dwell.destroy();
    const answerButtons = Array.from(answersGrid.querySelectorAll('.abtn'));
    dwell = new Dwell(
      (index) => selectAnswer(parseInt(index)),
      (index, progress, active) => {
        const button = answersGrid.querySelector(`[data-index="${index}"]`);
        if (button) {
          if (active && progress < 1) {
            button.classList.add('gz');
          } else {
            button.classList.remove('gz');
          }
          const progressBar = document.getElementById(`progress-${index}`);
          if (progressBar) {
            progressBar.style.width = active ? (progress * 100) + '%' : '0%';
          }
        }
      }
    );
    
    dwell.setItems(answerButtons.map(btn => ({
      id: btn.dataset.index,
      element: btn
    })));
    
    // Set hesitation timeout
    if (hesitationTimeout) clearTimeout(hesitationTimeout);
    hesitationTimeout = setTimeout(() => {
      if (currentScreen === 'question') {
        currentHesitations++;
        showHint(question.hint);
      }
    }, 6000);
  }
  
  function selectAnswer(index) {
    if (hesitationTimeout) clearTimeout(hesitationTimeout);
    if (dwell) dwell.destroy();
    
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = index === question.ans;
    
    // Highlight correct/incorrect answers
    const buttons = document.querySelectorAll('.abtn');
    buttons.forEach((btn, i) => {
      if (i === question.ans) {
        btn.classList.add('ok');
      } else if (i === index && !isCorrect) {
        btn.classList.add('no');
      }
    });
    
    if (isCorrect) {
      currentScore++;
      Voice.speak('إجابة صحيحة! أحسنت.');
    } else {
      Voice.speak(`إجابة خاطئة. الإجابة الصحيحة هي: ${question.opts[question.ans]}`);
    }
    
    // Move to next question after delay
    setTimeout(() => {
      currentQuestionIndex++;
      showQuestion();
    }, 2000);
  }
  
  function showHint(hint) {
    const hintDiv = document.getElementById('hint');
    const hintText = document.getElementById('htxt');
    if (hintText) hintText.textContent = hint;
    if (hintDiv) hintDiv.classList.add('on');
    Voice.speak('تلميح: ' + hint);
  }
  
  function hideHint() {
    const hintDiv = document.getElementById('hint');
    if (hintDiv) hintDiv.classList.remove('on');
  }
  
  function showResult() {
    showScreen('result');
    if (dwell) dwell.destroy();
    
    const total = currentQuestions.length;
    const percent = Math.round((currentScore / total) * 100);
    const duration = Math.round((Date.now() - startTime) / 1000);
    const subject = DB.getSubject(currentSubject);
    
    let emoji, title;
    if (percent >= 90) { emoji = '🏆'; title = 'أداء استثنائي!'; }
    else if (percent >= 70) { emoji = '⭐'; title = 'ممتاز!'; }
    else if (percent >= 50) { emoji = '👍'; title = 'جيد!'; }
    else { emoji = '💪'; title = 'استمر في المحاولة!'; }
    
    document.getElementById('rb').textContent = emoji;
    document.getElementById('rs').textContent = percent + '%';
    document.getElementById('rl').textContent = title;
    document.getElementById('ru').textContent = `أجبت على ${currentScore} من ${total} بشكل صحيح`;
    
    document.getElementById('rst').innerHTML = `
      <div class="rstat"><div class="rsv">${currentScore}/${total}</div><div class="rsl">صحيح</div></div>
      <div class="rstat"><div class="rsv">${duration}ث</div><div class="rsl">المدة</div></div>
      <div class="rstat"><div class="rsv">${currentHesitations}</div><div class="rsl">تلميحات</div></div>
    `;
    
    document.getElementById('rrep').innerHTML = `
      <div class="rrow"><span class="rlb">المادة</span><span class="rvl">${subject.emoji} ${subject.name}</span></div>
      <div class="rrow"><span class="rlb">النتيجة</span><span class="rvl ${percent >= 70 ? 'g' : 'w'}">${percent}%</span></div>
      <div class="rrow"><span class="rlb">طريقة التفاعل</span><span class="rvl">👁️ تتبع العين</span></div>
    `;
    
    Voice.speak(`انتهى الاختبار. حصلت على ${percent} بالمئة. ${title}`);
  }
  
  async function startCalibration() {
    // Pause tracking during calibration
    WebGazerManager.stop();
    if (dwell) dwell.destroy();
    
    await Calibration.start(
      (success) => {
        // Calibration complete
        WebGazerManager.start();
        Voice.speak('تمت المعايرة بنجاح');
        
        // If in subjects screen, rebuild dwell
        if (currentScreen === 'subjects') {
          buildSubjectsGrid();
        }
      },
      () => {
        // Calibration cancelled
        WebGazerManager.start();
      }
    );
  }
  
  function adjustDwellTime(delta) {
    const newTime = Math.max(1000, Math.min(8000, (dwell?.dwellTime || 3500) + delta));
    if (dwell) dwell.setDwellTime(newTime);
    document.getElementById('dv').textContent = (newTime / 1000).toFixed(1) + 's';
  }
  
  function goHome() {
    if (dwell) dwell.destroy();
    Voice.stop();
    if (hesitationTimeout) clearTimeout(hesitationTimeout);
    hideHint();
    showScreen('welcome');
  }
  
  function retry() {
    if (!currentSubject) return;
    currentQuestions = DB.getQuestions(currentSubject);
    currentQuestionIndex = 0;
    currentScore = 0;
    currentHesitations = 0;
    startTime = Date.now();
    showQuestion();
  }
  
  // Public API
  return {
    init,
    start,
    requestCamera,
    goHome,
    retry,
    startCalibration
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  EyeTrackingApp.init();
});