// Main application logic for head tracking version
const HeadTrackingApp = (() => {
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
  let headTracker = null;
  let sosStartTime = null;
  
  // DOM Elements
  let screens = {};
  let cursor = null;
  let statusDot = null;
  let statusText = null;
  let confidenceFill = null;
  
  // Sensitivity settings
  let sensitivityX = 2.8;
  let sensitivityY = 2.5;
  let smoothingAlpha = 0.10;
  
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
      result: document.getElementById('sr'),
      lesson: document.getElementById('sl')
    };
    
    // Initialize voice
    Voice.init();
    
    // Setup event listeners
    document.getElementById('dm')?.addEventListener('click', () => adjustDwellTime(-500));
    document.getElementById('dp')?.addEventListener('click', () => adjustDwellTime(500));
    document.getElementById('sos')?.addEventListener('click', () => triggerSOS());
    
    // Hide loading screen
    setTimeout(() => {
      const loader = document.getElementById('load');
      if (loader) loader.classList.add('out');
    }, 1600);
    
    // Initialize particles
    Utils.createParticles('pts', 30);
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
      if (cursor) cursor.classList.remove('low');
      if (statusDot) statusDot.className = 'dot ok';
      if (statusText) statusText.textContent = 'تتبع الرأس نشط';
    } else if (tracking && confidence > 0.25) {
      if (cursor) cursor.classList.add('low');
      if (statusDot) statusDot.className = 'dot wn';
      if (statusText) statusText.textContent = 'إشارة ضعيفة';
    } else {
      if (cursor) cursor.classList.remove('low');
      if (statusDot) statusDot.className = 'dot';
      if (statusText) statusText.textContent = 'لا يوجد وجه مكتشف';
    }
    
    // Update dwell selection
    if (dwell) {
      dwell.update(x, y);
    }
    
    // Check SOS button hover
    checkSOS(x, y);
  }
  
  function checkSOS(x, y) {
    const sosBtn = document.getElementById('sos');
    if (!sosBtn || !sosBtn.classList.contains('show')) return;
    
    const rect = sosBtn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);
    
    if (distance < 40) {
      if (!sosStartTime) {
        sosStartTime = performance.now();
      }
      const elapsed = performance.now() - sosStartTime;
      const progress = Math.min(1, elapsed / 3000);
      const svgCircle = document.getElementById('sosc');
      if (svgCircle) {
        svgCircle.style.strokeDashoffset = 164 * (1 - progress);
      }
      if (progress >= 1) {
        sosStartTime = null;
        triggerSOS();
      }
    } else {
      sosStartTime = null;
      const svgCircle = document.getElementById('sosc');
      if (svgCircle) {
        svgCircle.style.strokeDashoffset = 164;
      }
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
      document.getElementById('bar')?.classList.add('show');
      document.getElementById('sos')?.classList.add('show');
      document.getElementById('sosa')?.classList.add('show');
      document.getElementById('vi')?.style.display = 'flex';
      if (cursor) cursor.classList.add('on');
      
      // Initialize head tracking
      await HeadTracker.init();
      await HeadTracker.startCamera(video);
      HeadTracker.onGaze(onGaze);
      HeadTracker.setSensitivity(sensitivityX, sensitivityY);
      HeadTracker.setSmoothing(smoothingAlpha);
      
      Voice.speak('نظام تتبع الرأس جاهز. وجه رأسك نحو بطاقة المادة وثبته للاختيار.');
      
      showSubjects();
      
    } catch (error) {
      console.error('Camera error:', error);
      Utils.showToast('فشل الوصول للكاميرا. سيتم التبديل لوضع الماوس.', 'error');
      useMouseFallback();
    }
  }
  
  function useMouseFallback() {
    const fb = document.getElementById('fb');
    if (fb) fb.classList.add('on');
    
    document.addEventListener('mousemove', (e) => {
      if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      }
      onGaze(e.clientX, e.clientY, 0.9, true);
    });
    
    document.getElementById('bar')?.classList.add('show');
    document.getElementById('sos')?.classList.add('show');
    document.getElementById('vi')?.style.display = 'flex';
    if (cursor) cursor.classList.add('on');
    
    Voice.speak('وضع الماوس البديل نشط. حرك الماوس للتفاعل.');
    showSubjects();
  }
  
  function showSubjects() {
    showScreen('subjects');
    buildSubjectsGrid();
    Voice.speak('اختر مادة دراسية. وجه رأسك نحو البطاقة وثبت نظرك للاختيار.');
  }
  
  function buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid) return;
    
    grid.innerHTML = DB.subjects.map(subject => `
      <div class="scard" data-id="${subject.id}" data-c="${subject.color}">
        <svg class="dsvg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect class="drect" x="1.5" y="1.5" width="97" height="97" rx="19"/>
        </svg>
        <div class="sem">${subject.emoji}</div>
        <div class="snm">${subject.name}</div>
        <div class="sct">5 أسئلة + درس تعليمي</div>
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
          const rect = card.querySelector('.drect');
          if (rect && active) {
            rect.style.strokeDashoffset = 1000 * (1 - progress);
          } else if (rect) {
            rect.style.strokeDashoffset = 1000;
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
    Voice.speak(`رائع! لقد اخترت ${subject.name}. هل تريد قراءة الدرس أولاً أم البدء بالاختبار مباشرة؟`);
    
    // Show lesson or quiz choice
    showLessonOrQuiz();
  }
  
  function showLessonOrQuiz() {
    const subject = DB.getSubject(currentSubject);
    const choice = confirm(`📖 ${subject.name}\n\nهل تريد قراءة الدرس التعليمي أولاً؟\n\n• OK = قراءة الدرس\n• Cancel = البدء بالاختبار مباشرة`);
    
    if (choice) {
      showLesson();
    } else {
      startQuiz();
    }
  }
  
  function showLesson() {
    const lessons = DB.getLessons(currentSubject);
    let lessonIndex = 0;
    
    function renderLesson() {
      showScreen('lesson');
      
      const lesson = lessons[lessonIndex];
      const total = lessons.length;
      
      document.getElementById('lc').textContent = `الدرس ${lessonIndex + 1} من ${total}`;
      document.getElementById('lpf').style.width = `${((lessonIndex + 1) / total) * 100}%`;
      document.getElementById('lbox').innerHTML = `
        <div class="ltit">${lesson.title}</div>
        <div class="lp">${lesson.body}</div>
      `;
      
      const nav = document.getElementById('lnav');
      nav.innerHTML = `
        ${lessonIndex > 0 ? '<button class="lbtn" data-action="prev">← السابق</button>' : ''}
        <div class="lsep"></div>
        ${lessonIndex < total - 1 ? 
          '<button class="lbtn pri" data-action="next">التالي →</button>' : 
          '<button class="lbtn pri" data-action="quiz">ابدأ الاختبار ✏️</button>'}
      `;
      
      Voice.speak(lesson.title);
      
      if (dwell) dwell.destroy();
      const buttons = Array.from(nav.querySelectorAll('.lbtn'));
      dwell = new Dwell(
        (action) => {
          if (action === 'next') {
            lessonIndex++;
            renderLesson();
          } else if (action === 'prev') {
            lessonIndex--;
            renderLesson();
          } else if (action === 'quiz') {
            startQuiz();
          }
        },
        (action, progress, active) => {
          const btn = nav.querySelector(`[data-action="${action}"]`);
          if (btn) {
            btn.classList.toggle('gz', active);
          }
        }
      );
      dwell.setItems(buttons.map(btn => ({
        id: btn.dataset.action,
        element: btn
      })));
    }
    
    renderLesson();
  }
  
  function startQuiz() {
    currentQuestionIndex = 0;
    currentScore = 0;
    currentHesitations = 0;
    startTime = Date.now();
    showQuestion();
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
      <div class="rrow"><span class="rlb">متوسط وقت السؤال</span><span class="rvl">${Math.round(duration / total)}ث</span></div>
      <div class="rrow"><span class="rlb">طريقة التفاعل</span><span class="rvl">🎯 تتبع الرأس</span></div>
    `;
    
    Voice.speak(`انتهى الاختبار. حصلت على ${percent} بالمئة. ${message}`);
    
    // Setup dwell for result buttons
    setTimeout(() => {
      const actions = document.querySelector('.racts');
      if (!actions) return;
      
      const buttons = Array.from(actions.querySelectorAll('button'));
      const btnMap = buttons.map(btn => {
        const text = btn.textContent.trim();
        let id = '';
        if (text.includes('إعادة')) id = 'retry';
        else if (text.includes('الرئيسية')) id = 'home';
        else if (text.includes('محتوى')) id = 'lesson';
        btn.dataset.action = id;
        return { id, element: btn };
      }).filter(b => b.id);
      
      dwell = new Dwell(
        (action) => {
          dwell = null;
          if (action === 'retry') retry();
          else if (action === 'home') goHome();
          else if (action === 'lesson') showLesson();
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
    }, 150);
  }
  
  function triggerSOS() {
    const sosModal = document.getElementById('sosm');
    if (sosModal) {
      sosModal.classList.add('on');
      Voice.speak('تم تفعيل وضع الطوارئ.');
    }
    if (dwell) dwell.destroy();
    dwell = null;
  }
  
  function closeSOS() {
    const sosModal = document.getElementById('sosm');
    if (sosModal) {
      sosModal.classList.remove('on');
    }
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
    closeSOS();
    showScreen('welcome');
  }
  
  function retry() {
    if (!currentSubject) return;
    currentQuestions = DB.getQuestions(currentSubject);
    currentQuestionIndex = 0;
    currentScore = 0;
    currentHesitations = 0;
    startTime = Date.now();
    startQuiz();
  }
  
  function setSensitivity(x, y) {
    sensitivityX = x;
    sensitivityY = y;
    HeadTracker.setSensitivity(x, y);
  }
  
  // Public API
  return {
    init,
    start,
    requestCamera,
    goHome,
    retry,
    closeSOS,
    triggerSOS,
    setSensitivity
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  HeadTrackingApp.init();
});