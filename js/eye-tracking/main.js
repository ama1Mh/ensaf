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
  let eyeTracker = null;
  
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
    if (typeof Voice !== 'undefined') {
      Voice.init();
    }
    
    // Setup event listeners
    const dmBtn = document.getElementById('dm');
    const dpBtn = document.getElementById('dp');
    
    if (dmBtn) dmBtn.addEventListener('click', () => adjustDwellTime(-500));
    if (dpBtn) dpBtn.addEventListener('click', () => adjustDwellTime(500));
    
    // Hide loading screen
    setTimeout(() => {
      const loader = document.getElementById('load');
      if (loader) loader.classList.add('out');
    }, 1600);
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
  
  function onGaze(x, y, confidence, tracking) {
    // Update cursor position
    if (cursor) {
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    }
    
    // Update status bar
    if (confidenceFill) {
      confidenceFill.style.width = (confidence * 100) + '%';
    }
    
    if (tracking && confidence > 0.55) {
      if (statusDot) statusDot.className = 'dot ok';
      if (statusText) statusText.textContent = 'تتبع العين نشط';
    } else if (tracking && confidence > 0.25) {
      if (statusDot) statusDot.className = 'dot wn';
      if (statusText) statusText.textContent = 'تتبع غير مستقر';
    } else {
      if (statusDot) statusDot.className = 'dot';
      if (statusText) statusText.textContent = 'لا يوجد وجه مكتشف';
    }
    
    // Update dwell selection
    if (dwell) {
      dwell.update(x, y);
    }
  }
  
  async function start() {
    showScreen('permission');
  }
  
  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user', frameRate: 30 }
      });
      
      const video = document.getElementById('vcam');
      if (video) {
        video.srcObject = stream;
        video.classList.add('show');
      }
      
      // Show UI elements
      const bar = document.getElementById('bar');
      const vi = document.getElementById('vi');
      
      if (bar) bar.classList.add('show');
      if (vi) vi.style.display = 'flex';
      if (cursor) cursor.classList.add('on');
      
      // Initialize eye tracking with MediaPipe
      if (typeof EyeTracker !== 'undefined') {
        await EyeTracker.init();
        await EyeTracker.startCamera(video);
        EyeTracker.addListener(onGaze);
      } else {
        console.error('EyeTracker not loaded');
        throw new Error('EyeTracker not available');
      }
      
      if (typeof Voice !== 'undefined') {
        Voice.speak('تم تفعيل تتبع العين. حرك عينيك لتحريك المؤشر.');
      }
      
      showSubjects();
      
    } catch (error) {
      console.error('Camera error:', error);
      if (typeof Utils !== 'undefined') {
        Utils.showToast('فشل الوصول للكاميرا. تأكد من منح الإذن.', 'error');
      } else {
        alert('فشل الوصول للكاميرا. تأكد من منح الإذن.');
      }
    }
  }
  
  function showSubjects() {
    showScreen('subjects');
    buildSubjectsGrid();
    if (typeof Voice !== 'undefined') {
      Voice.speak('اختر مادة دراسية. انظر إلى البطاقة وثبّت نظرك للاختيار.');
    }
  }
  
  function buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid) return;
    
    if (typeof DB === 'undefined') {
      console.error('Database not loaded');
      return;
    }
    
    grid.innerHTML = DB.subjects.map(subject => `
      <div class="scard" data-id="${subject.id}">
        <div class="sem">${subject.emoji}</div>
        <div class="snm">${subject.name}</div>
        <div class="sct">5 أسئلة</div>
      </div>
    `).join('');
    
    const cards = Array.from(grid.querySelectorAll('.scard'));
    
    // Initialize dwell for subject selection
    if (dwell && dwell.destroy) dwell.destroy();
    
    if (typeof Dwell !== 'undefined') {
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
      
      const items = cards.map(card => ({
        id: card.dataset.id,
        element: card
      }));
      
      dwell.setItems(items);
    }
  }
  
  function selectSubject(subjectId) {
    currentSubject = subjectId;
    if (dwell) dwell.destroy();
    
    // Load questions
    if (typeof DB !== 'undefined') {
      currentQuestions = DB.getQuestions(subjectId);
    }
    currentQuestionIndex = 0;
    currentScore = 0;
    currentHesitations = 0;
    startTime = Date.now();
    
    const subject = typeof DB !== 'undefined' ? DB.getSubject(subjectId) : null;
    if (typeof Voice !== 'undefined') {
      Voice.speak(`لقد اخترت ${subject ? subject.name : 'المادة'}. سيبدأ الاختبار الآن.`);
    }
    
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
    const subject = typeof DB !== 'undefined' ? DB.getSubject(currentSubject) : null;
    const total = currentQuestions.length;
    
    // Update UI
    const qcElement = document.getElementById('qc');
    const qpfElement = document.getElementById('qpf');
    const qptsElement = document.getElementById('qpts');
    const qtagElement = document.getElementById('qtag');
    const qtxtElement = document.getElementById('qtxt');
    const answersGrid = document.getElementById('agrid');
    
    if (qcElement) qcElement.textContent = `السؤال ${currentQuestionIndex + 1} من ${total}`;
    if (qpfElement) qpfElement.style.width = `${(currentQuestionIndex / total) * 100}%`;
    if (qptsElement) qptsElement.textContent = `⭐ ${currentScore}`;
    if (qtagElement) qtagElement.innerHTML = `${subject ? subject.emoji : '📚'} ${subject ? subject.name : 'المادة'}`;
    if (qtxtElement) qtxtElement.textContent = question.q;
    
    // Build answers grid
    const letters = ['أ', 'ب', 'ج', 'د'];
    if (answersGrid) {
      answersGrid.innerHTML = question.opts.map((opt, i) => `
        <div class="abtn" data-index="${i}">
          <div class="altr">${letters[i]}</div>
          <div class="atxt">${opt}</div>
          <div class="adw"><div class="adwf" id="progress-${i}"></div></div>
        </div>
      `).join('');
    }
    
    if (typeof Voice !== 'undefined') {
      Voice.speak(question.q);
    }
    
    // Setup dwell for answers
    if (dwell && dwell.destroy) dwell.destroy();
    
    if (typeof Dwell !== 'undefined' && answersGrid) {
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
      
      const items = answerButtons.map(btn => ({
        id: btn.dataset.index,
        element: btn
      }));
      
      dwell.setItems(items);
    }
    
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
      if (typeof Voice !== 'undefined') {
        Voice.speak('إجابة صحيحة! أحسنت.');
      }
    } else {
      if (typeof Voice !== 'undefined') {
        Voice.speak(`إجابة خاطئة. الإجابة الصحيحة هي: ${question.opts[question.ans]}`);
      }
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
    if (typeof Voice !== 'undefined') {
      Voice.speak('تلميح: ' + hint);
    }
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
    const subject = typeof DB !== 'undefined' ? DB.getSubject(currentSubject) : null;
    
    let emoji, title, message;
    if (percent >= 90) {
      emoji = '🏆';
      title = 'أداء استثنائي!';
      message = 'أداء مثالي! أنت متميز.';
    } else if (percent >= 70) {
      emoji = '⭐';
      title = 'ممتاز!';
      message = 'عمل رائع! استمر بهذا المستوى.';
    } else if (percent >= 50) {
      emoji = '👍';
      title = 'جيد!';
      message = 'نتيجة جيدة. استمر في التدريب.';
    } else {
      emoji = '💪';
      title = 'استمر في المحاولة!';
      message = 'راجع المادة وحاول مرة أخرى. أنت قادر على تحسين أدائك.';
    }
    
    const rbElement = document.getElementById('rb');
    const rsElement = document.getElementById('rs');
    const rlElement = document.getElementById('rl');
    const ruElement = document.getElementById('ru');
    const rstElement = document.getElementById('rst');
    const rrepElement = document.getElementById('rrep');
    
    if (rbElement) rbElement.textContent = emoji;
    if (rsElement) rsElement.textContent = percent + '%';
    if (rlElement) rlElement.textContent = title;
    if (ruElement) ruElement.textContent = `أجبت على ${currentScore} من ${total} بشكل صحيح`;
    
    if (rstElement) {
      rstElement.innerHTML = `
        <div class="rstat"><div class="rsv">${currentScore}/${total}</div><div class="rsl">صحيح</div></div>
        <div class="rstat"><div class="rsv">${duration}ث</div><div class="rsl">المدة</div></div>
        <div class="rstat"><div class="rsv">${currentHesitations}</div><div class="rsl">تلميحات</div></div>
      `;
    }
    
    if (rrepElement) {
      rrepElement.innerHTML = `
        <div class="rrow"><span class="rlb">المادة</span><span class="rvl">${subject ? subject.emoji : '📚'} ${subject ? subject.name : 'المادة'}</span></div>
        <div class="rrow"><span class="rlb">النتيجة</span><span class="rvl ${percent >= 70 ? 'g' : 'w'}">${percent}%</span></div>
        <div class="rrow"><span class="rlb">متوسط وقت السؤال</span><span class="rvl">${Math.round(duration / total)}ث</span></div>
        <div class="rrow"><span class="rlb">طريقة التفاعل</span><span class="rvl">👁️ تتبع العين</span></div>
      `;
    }
    
    if (typeof Voice !== 'undefined') {
      Voice.speak(`انتهى الاختبار. حصلت على ${percent} بالمئة. ${message}`);
    }
    
    // Setup dwell for result buttons
    setTimeout(() => {
      const actions = document.querySelector('.racts');
      if (!actions) return;
      
      const buttons = Array.from(actions.querySelectorAll('button'));
      const btnMap = [];
      
      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        let id = '';
        if (text.includes('إعادة')) id = 'retry';
        else if (text.includes('الرئيسية')) id = 'home';
        if (id) {
          btn.dataset.action = id;
          btnMap.push({ id: id, element: btn });
        }
      });
      
      if (btnMap.length > 0 && typeof Dwell !== 'undefined') {
        dwell = new Dwell(
          (action) => {
            dwell = null;
            if (action === 'retry') retry();
            else if (action === 'home') goHome();
          },
          (action, progress, active) => {
            const btn = actions.querySelector(`[data-action="${action}"]`);
            if (btn) {
              btn.style.outline = active ? `2px solid rgba(0,240,255,${progress.toFixed(2)})` : '';
              btn.style.transform = active ? `scale(${1 + progress * 0.05})` : '';
            }
          }
        );
        dwell.setItems(btnMap);
      }
    }, 150);
  }
  
  function adjustDwellTime(delta) {
    const currentTime = dwell ? dwell.dwellTime : 3500;
    const newTime = Math.max(1000, Math.min(8000, currentTime + delta));
    if (dwell) dwell.setDwellTime(newTime);
    const dvElement = document.getElementById('dv');
    if (dvElement) dvElement.textContent = (newTime / 1000).toFixed(1) + 's';
  }
  
  function goHome() {
    if (dwell) dwell.destroy();
    if (typeof Voice !== 'undefined') {
      Voice.stop();
    }
    if (hesitationTimeout) clearTimeout(hesitationTimeout);
    hideHint();
    showScreen('welcome');
  }
  
  function retry() {
    if (!currentSubject) return;
    if (typeof DB !== 'undefined') {
      currentQuestions = DB.getQuestions(currentSubject);
    }
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
    retry
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof EyeTrackingApp !== 'undefined') {
    EyeTrackingApp.init();
  }
});