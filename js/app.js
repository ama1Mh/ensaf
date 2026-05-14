/**
 * ENSAF Main Application
 * Orchestrates all modules: tracking, interaction, quiz, lessons
 */
class EnsafApp {
  constructor() {
    this.state = STATE;
    this.tracker = null;
    this.dwell = null;
    this.hesitationTimeout = null;
  }

  getIcon(name, size = 'sm') {
    return `<span class="material-symbols-outlined icon icon-${size}">${name}</span>`;
  }

  iconLabel(name, label) {
    return `${this.getIcon(name)}${label}`;
  }

  init() {
    // Hide loader after animation
    setTimeout(() => {
      const loader = document.getElementById('load');
      if (loader) loader.classList.add('out');
    }, 1600);
    
    // Setup event listeners - with null checks
    const dmBtn = document.getElementById('dm');
    const dpBtn = document.getElementById('dp');
    const themeBtn = document.getElementById('theme-btn');
    
    if (dmBtn) dmBtn.onclick = () => this.adjustDwell(-500);
    if (dpBtn) dpBtn.onclick = () => this.adjustDwell(+500);
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();
    
    // Mode buttons
    document.querySelectorAll('.mbtn').forEach(btn => {
      btn.onclick = () => this.setMode(btn.dataset.mode, btn);
    });

    this.initTheme();
    console.log('[ENSAF] App initialized - Mode:', this.state.get('mode'));
  }

  setMode(mode, button) {
    this.state.set('mode', mode);
    
    // Update button styles
    document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('act'));
    if (button) button.classList.add('act');
    
    // Update mode indicator in top bar
    const indicator = document.getElementById('mode-indicator');
    if (indicator) {
      indicator.className = 'mode-indicator';
      switch(mode) {
        case 'head':
          indicator.classList.add('mode-head');
          indicator.innerHTML = this.iconLabel('track_changes', 'تتبع الرأس');
          break;
        case 'eye':
          indicator.classList.add('mode-eye');
          indicator.innerHTML = this.iconLabel('visibility', 'تتبع العين');
          break;
        case 'mouse':
          indicator.classList.add('mode-mouse');
          indicator.innerHTML = this.iconLabel('mouse', 'الماوس');
          break;
      }
    }
    
    // Show/hide fallback indicator
    const fb = document.getElementById('fb');
    if (fb) {
      fb.classList.toggle('on', mode === 'mouse');
    }
    
    console.log('[ENSAF] Mode changed to:', mode);
  }

  initTheme() {
    const savedTheme = localStorage.getItem('ensaf-theme') || 'default';
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const nextTheme = document.body.classList.contains('theme-warm') ? 'default' : 'warm';
    this.applyTheme(nextTheme);
  }

  applyTheme(theme) {
    document.body.classList.toggle('theme-warm', theme === 'warm');
    localStorage.setItem('ensaf-theme', theme);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = this.getIcon(theme === 'warm' ? 'dark_mode' : 'light_mode');
      themeBtn.title = theme === 'warm' ? 'الوضع الليلي' : 'الوضع الافتراضي';
    }
  }

  start() {
    const mode = this.state.get('mode');
    if (mode === 'mouse') {
      this._setupMouseMode();
      this.showScreen('s');
      this.buildSubjectsGrid();
    } else {
      this.showScreen('p'); // Permission screen
    }
  }

  useMouse() {
    const mouseBtn = document.querySelector('[data-mode="mouse"]');
    this.setMode('mouse', mouseBtn);
    this._setupMouseMode();
    this.showScreen('s');
    this.buildSubjectsGrid();
  }

  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: CONFIG.CAMERA.WIDTH,
          height: CONFIG.CAMERA.HEIGHT,
          facingMode: CONFIG.CAMERA.FACING_MODE,
          frameRate: CONFIG.CAMERA.FRAMERATE
        }
      });
      
      const video = document.getElementById('vcam');
      if (video) {
        video.srcObject = stream;
        video.classList.add('show');
      }
      
      // Initialize tracker based on mode
      const mode = this.state.get('mode');
      console.log('[ENSAF] Starting tracker for mode:', mode);
      
      if (mode === 'head') {
        this.tracker = new HeadTracker();
      } else if (mode === 'eye') {
        this.tracker = new EyeTracker();
      } else {
        this.tracker = new HeadTracker(); // Default
      }
      
      if (this.tracker) {
        await this.tracker.startCamera(video);
        this.tracker.onUpdate((x, y, conf, tracking) => {
          this._onTrackingUpdate(x, y, conf, tracking);
        });
        
        const cursor = document.getElementById('cursor');
        if (cursor) cursor.classList.add('on');
        
        this._showUI();
        this.showScreen('s');
        this.buildSubjectsGrid();
        
        // Use VoiceManager from voice.js
        if (typeof VoiceManager !== 'undefined') {
          VoiceManager.speak('نظام التتبع جاهز. اختر مادة دراسية.');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      this._switchToMouse();
    }
  }

  _onTrackingUpdate(x, y, confidence, tracking) {
    // Update cursor position
    const cursor = document.getElementById('cursor');
    if (cursor) {
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    }
    
    // Update status bar
    const statusDot = document.getElementById('bdot');
    const statusText = document.getElementById('bst');
    const confFill = document.getElementById('cff');
    
    if (confFill) confFill.style.width = (confidence * 100) + '%';
    
    if (tracking && confidence > 0.55) {
      if (cursor) cursor.classList.remove('low');
      if (statusDot) statusDot.className = 'dot ok';
      if (statusText) statusText.textContent = 'التتبع نشط';
    } else if (tracking && confidence > 0.25) {
      if (cursor) cursor.classList.add('low');
      if (statusDot) statusDot.className = 'dot wn';
      if (statusText) statusText.textContent = 'إشارة ضعيفة';
    } else {
      if (cursor) cursor.classList.remove('low');
      if (statusDot) statusDot.className = 'dot';
      if (statusText) statusText.textContent = 'لا يوجد وجه';
    }
    
    // Update dwell
    if (this.dwell) {
      this.dwell.update(x, y);
    }
    
    // Check SOS proximity
    this._checkSOS(x, y);
  }

  _setupMouseMode() {
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.classList.add('on');
    
    document.addEventListener('mousemove', (e) => {
      const cur = document.getElementById('cursor');
      if (cur) {
        cur.style.left = e.clientX + 'px';
        cur.style.top = e.clientY + 'px';
      }
      
      if (this.dwell) {
        this.dwell.update(e.clientX, e.clientY);
      }
    });
    
    this._showUI();
    this.state.set('tracking.active', true);
    this.state.set('tracking.confidence', 0.9);
  }

  _switchToMouse() {
    alert('تعذر تشغيل الكاميرا. جاري التبديل إلى وضع الماوس.');
    this.useMouse();
  }

  _showUI() {
    const bar = document.getElementById('bar');
    const vi = document.getElementById('vi');
    
    if (bar) bar.classList.add('show');
    if (vi) vi.style.display = 'flex';
  }

  showScreen(screenId) {
    const screens = {
      'w': 'sw',
      'p': 'sp', 
      's': 'ss',
      'q': 'sq',
      'l': 'sl',
      'r': 'sr'
    };
    
    document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
    const targetId = screens[screenId] || screenId;
    const target = document.getElementById(targetId);
    if (target) target.classList.add('on');
    this.state.set('screen', screenId);
  }

  buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid) {
      console.error('[ENSAF] Subjects grid element not found');
      return;
    }
    
    if (typeof DB === 'undefined') {
      console.error('[ENSAF] Database not loaded');
      return;
    }
    
    grid.innerHTML = DB.subjects.map(s => `
      <div class="scard" data-c="${s.color}" data-id="${s.id}">
        
        <div class="sem">${this.getIcon(s.icon, 'lg')}</div>
        <div class="snm">${s.name}</div>
        <div class="sct">${DB.getQuestionCount(s.id)} أسئلة</div>
      </div>
    `).join('');
    
    // Setup dwell
    if (this.dwell && this.dwell.destroy) this.dwell.destroy();
    
    const cards = Array.from(grid.querySelectorAll('.scard'));
    this.dwell = new DwellSystem({
      onSelect: (id) => this.selectSubject(id),
      onProgress: (id, progress, active) => {
        const el = grid.querySelector(`[data-id="${id}"]`);
        if (!el) return;
        el.classList.toggle('gz', active);
         }
    });
    
    this.dwell.setDwellTime(this.state.get('dwell.ms'));
    this.dwell.setItems(cards.map(card => ({
      id: card.dataset.id,
      element: card
    })));
  }

  selectSubject(subjectId) {
    this.state.set('quiz.subject', subjectId);
    this.dwell = null;
    
    if (typeof DB === 'undefined') return;
    
    const questions = DB.getQuestions(subjectId, CONFIG.QUIZ.QUESTIONS_PER_ROUND);
    
    this.state.set('quiz.questions', questions);
    this.state.set('quiz.index', 0);
    this.state.set('quiz.score', 0);
    this.state.set('quiz.hesitations', 0);
    this.state.set('quiz.startTime', Date.now());
    
    const subject = DB.getSubject(subjectId);
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(`اخترت ${subject ? subject.name : 'المادة'}. سيبدأ الاختبار الآن.`);
    }
    
    setTimeout(() => this.showQuestion(), 500);
  }

  showQuestion() {
    const index = this.state.get('quiz.index');
    const questions = this.state.get('quiz.questions');
    
    if (!questions || index >= questions.length) {
      this.showResult();
      return;
    }
    
    this.showScreen('q');
    this._hideHint();
    
    const q = questions[index];
    const subject = DB.getSubject(this.state.get('quiz.subject'));
    const total = questions.length;
    
    const qc = document.getElementById('qc');
    const qpf = document.getElementById('qpf');
    const qpts = document.getElementById('qpts');
    const qtag = document.getElementById('qtag');
    const qtxt = document.getElementById('qtxt');
    
    if (qc) qc.textContent = `السؤال ${index + 1} من ${total}`;
    if (qpf) qpf.style.width = `${(index / total) * 100}%`;
    if (qpts) qpts.innerHTML = `${this.getIcon('star')} ${this.state.get('quiz.score')}`;
    if (qtag) qtag.innerHTML = `${this.getIcon(subject ? subject.icon : 'menu_book')} ${subject ? subject.name : 'المادة'}`;
    if (qtxt) qtxt.textContent = q.q;
    
    const answersGrid = document.getElementById('agrid');
    if (!answersGrid) return;
    
    const letters = ['أ', 'ب', 'ج', 'د'];
    answersGrid.innerHTML = q.opts.map((opt, i) => `
      <div class="abtn" data-i="${i}">
        <div class="altr">${letters[i]}</div>
        <div class="atxt">${opt}</div>
        <div class="adw"><div class="adwf" id="df${i}"></div></div>
      </div>
    `).join('');
    
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(q.q);
    }
    
    // Setup dwell for answers
    if (this.dwell && this.dwell.destroy) this.dwell.destroy();
    
    const buttons = Array.from(answersGrid.querySelectorAll('.abtn'));
    this.dwell = new DwellSystem({
      onSelect: (id) => this.selectAnswer(parseInt(id)),
      onProgress: (id, progress, active) => {
        const btn = answersGrid.querySelector(`[data-i="${id}"]`);
        if (!btn) return;
        btn.classList.toggle('gz', active && progress < 1);
        const fill = document.getElementById(`df${id}`);
        if (fill) fill.style.width = active ? (progress * 100) + '%' : '0%';
      }
    });
    
    this.dwell.setDwellTime(this.state.get('dwell.ms'));
    this.dwell.setItems(buttons.map(btn => ({
      id: btn.dataset.i,
      element: btn
    })));
    
    // Hesitation timeout
    clearTimeout(this.hesitationTimeout);
    this.hesitationTimeout = setTimeout(() => {
      if (this.state.get('screen') === 'q') {
        this.state.set('quiz.hesitations', this.state.get('quiz.hesitations') + 1);
        this._showHint(q.hint);
      }
    }, CONFIG.QUIZ.HESITATION_TIMEOUT);
  }

  selectAnswer(index) {
    clearTimeout(this.hesitationTimeout);
    this.dwell = null;
    
    const questions = this.state.get('quiz.questions');
    const qIndex = this.state.get('quiz.index');
    const q = questions[qIndex];
    const correct = index === q.ans;
    
    document.querySelectorAll('.abtn').forEach((btn, i) => {
      if (i === q.ans) btn.classList.add('ok');
      else if (i === index && !correct) btn.classList.add('no');
    });
    
    if (correct) {
      this.state.set('quiz.score', this.state.get('quiz.score') + 1);
      if (typeof VoiceManager !== 'undefined') VoiceManager.speak('إجابة صحيحة!');
    } else {
      if (typeof VoiceManager !== 'undefined') {
        VoiceManager.speak(`الإجابة الصحيحة هي: ${q.opts[q.ans]}`);
      }
    }
    
    setTimeout(() => {
      this.state.set('quiz.index', qIndex + 1);
      this.showQuestion();
    }, CONFIG.QUIZ.ANSWER_DELAY);
  }

  _showHint(hint) {
    const htxt = document.getElementById('htxt');
    const hintEl = document.getElementById('hint');
    if (htxt) htxt.textContent = hint;
    if (hintEl) hintEl.classList.add('on');
    if (typeof VoiceManager !== 'undefined') VoiceManager.speak('تلميح: ' + hint);
  }

  _hideHint() {
    const hintEl = document.getElementById('hint');
    if (hintEl) hintEl.classList.remove('on');
  }

  showResult() {
    this.showScreen('r');
    this.dwell = null;
    
    const score = this.state.get('quiz.score');
    const total = this.state.get('quiz.questions').length;
    const percent = Math.round((score / total) * 100);
    const duration = Math.round((Date.now() - this.state.get('quiz.startTime')) / 1000);
    const subject = DB.getSubject(this.state.get('quiz.subject'));
    const hesitations = this.state.get('quiz.hesitations');
    
    // Determine grade
    let icon, label, message;
    if (percent >= 90) {
      icon = 'emoji_events'; label = 'أداء استثنائي!'; message = 'عمل مثالي!';
    } else if (percent >= 70) {
      icon = 'star'; label = 'ممتاز!'; message = 'عمل رائع!';
    } else if (percent >= 50) {
      icon = 'thumb_up'; label = 'جيد!'; message = 'استمر في التدريب.';
    } else {
      icon = 'fitness_center'; label = 'استمر في المحاولة!'; message = 'راجع المادة وحاول مجدداً.';
    }
    
    const rb = document.getElementById('rb');
    const rs = document.getElementById('rs');
    const rl = document.getElementById('rl');
    const ru = document.getElementById('ru');
    const rst = document.getElementById('rst');
    const rrep = document.getElementById('rrep');
    
    if (rb) rb.innerHTML = `${this.getIcon(icon, 'lg')}`;
    if (rs) rs.textContent = percent + '%';
    if (rl) rl.textContent = label;
    if (ru) ru.textContent = `أجبت على ${score} من ${total} بشكل صحيح`;
    
    if (rst) {
      rst.innerHTML = `
        <div class="rstat"><div class="rsv">${score}/${total}</div><div class="rsl">صحيح</div></div>
        <div class="rstat"><div class="rsv">${duration}ث</div><div class="rsl">المدة</div></div>
        <div class="rstat"><div class="rsv">${hesitations}</div><div class="rsl">تلميحات</div></div>
      `;
    }
    
    if (rrep) {
      const modeLabel = this._getModeLabel();
      rrep.innerHTML = `
        <div class="rrow"><span class="rlb">المادة</span><span class="rvl">${this.getIcon(subject ? subject.icon : 'menu_book')} ${subject ? subject.name : 'المادة'}</span></div>
        <div class="rrow"><span class="rlb">النتيجة</span><span class="rvl ${percent >= 70 ? 'g' : 'w'}">${percent}%</span></div>
        <div class="rrow"><span class="rlb">متوسط وقت السؤال</span><span class="rvl">${Math.round(duration / total)}ث</span></div>
        <div class="rrow"><span class="rlb">طريقة التفاعل</span><span class="rvl">${modeLabel}</span></div>
      `;
    }
    
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(`انتهى الاختبار. حصلت على ${percent} بالمئة. ${message}`);
    }
    
    // Setup result buttons
    setTimeout(() => {
      const actions = document.querySelector('.racts');
      if (!actions) return;
      
      const btns = Array.from(actions.querySelectorAll('button'));
      btns.forEach(b => {
        const text = b.textContent.trim();
        if (text.includes('إعادة')) b.dataset.ra = 'retry';
        else if (text.includes('الرئيسية')) b.dataset.ra = 'home';
        else if (text.includes('محتوى')) b.dataset.ra = 'study';
      });
      
      const targets = btns.filter(b => b.dataset.ra);
      
      this.dwell = new DwellSystem({
        onSelect: (id) => {
          this.dwell = null;
          if (id === 'retry') this.retry();
          else if (id === 'home') this.home();
          else if (id === 'study') this.showLesson();
        },
        onProgress: (id, progress, active) => {
          const btn = actions.querySelector(`[data-ra="${id}"]`);
          if (!btn) return;
          btn.style.outline = active ? `2px solid rgba(0,240,255,${progress})` : '';
          btn.style.transform = active ? `scale(${1 + progress * 0.04})` : '';
        }
      });
      
      this.dwell.setDwellTime(this.state.get('dwell.ms'));
      this.dwell.setItems(targets.map(b => ({ id: b.dataset.ra, element: b })));
    }, 150);
  }

  _getModeLabel() {
    const mode = this.state.get('mode');
    switch(mode) {
      case 'head': return 'تتبع الرأس';
      case 'eye': return 'تتبع العين';
      case 'mouse': return 'الماوس';
      default: return mode || 'غير محدد';
    }
  }

  showLesson() {
    if (typeof DB === 'undefined') return;
    
    const lessons = DB.getLessons(this.state.get('quiz.subject'));
    if (!lessons.length) return;
    
    let lessonIndex = 0;
    
    const showLessonPage = (idx) => {
      this.showScreen('l');
      const lesson = lessons[idx];
      
      const lc = document.getElementById('lc');
      const lpf = document.getElementById('lpf');
      const lbox = document.getElementById('lbox');
      const lnav = document.getElementById('lnav');
      
      if (lc) lc.textContent = `الدرس ${idx + 1} من ${lessons.length}`;
      if (lpf) lpf.style.width = `${((idx + 1) / lessons.length) * 100}%`;
      if (lbox) lbox.innerHTML = `
        <div class="ltit">${lesson.title}</div>
        <div class="lp">${lesson.body}</div>
      `;
      
      if (lnav) {
        lnav.innerHTML = `
          ${idx > 0 ? `<button class="lbtn" data-a="prev">← السابق</button>` : ''}
          <div class="lsep"></div>
          ${idx < lessons.length - 1 ? 
            `<button class="lbtn pri" data-a="next">التالي →</button>` : 
            `<button class="lbtn pri" data-a="quiz">اختبار <span class="material-symbols-outlined icon icon-sm">edit</span></button>`}
        `;
      }
      
      if (typeof VoiceManager !== 'undefined') {
        VoiceManager.speak(lesson.title + '. ' + lesson.body.replace(/<[^>]+>/g, ''));
      }
      
      if (this.dwell && this.dwell.destroy) this.dwell.destroy();
      
      const navBtns = lnav ? Array.from(lnav.querySelectorAll('.lbtn')) : [];
      this.dwell = new DwellSystem({
        onSelect: (action) => {
          if (action === 'next') showLessonPage(idx + 1);
          else if (action === 'prev') showLessonPage(idx - 1);
          else {
            const questions = DB.getQuestions(this.state.get('quiz.subject'), CONFIG.QUIZ.QUESTIONS_PER_ROUND);
            this.state.set('quiz.questions', questions);
            this.state.set('quiz.index', 0);
            this.state.set('quiz.score', 0);
            this.state.set('quiz.hesitations', 0);
            this.state.set('quiz.startTime', Date.now());
            this.showQuestion();
          }
        },
        onProgress: (action, progress, active) => {
          const btn = lnav ? lnav.querySelector(`[data-a="${action}"]`) : null;
          if (btn) btn.classList.toggle('gz', active);
        }
      });
      
      this.dwell.setDwellTime(this.state.get('dwell.ms'));
      this.dwell.setItems(navBtns.map(btn => ({ id: btn.dataset.a, element: btn })));
    };
    
    showLessonPage(0);
  }

  /* ── Recalibration ── */
  recalibrate() {
    if (this.tracker && this.tracker.reset) {
      this.tracker.reset();
    }
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak('جاري إعادة ضبط التتبع. انظر مباشرة إلى الشاشة.');
    }
  }

  /* ── SOS System ── */
  _checkSOS(x, y) {
    const sosBtn = document.getElementById('sos');
    if (!sosBtn || !sosBtn.classList.contains('show')) return;
    
    const rect = sosBtn.getBoundingClientRect();
    const distance = Math.hypot(
      x - (rect.left + rect.width / 2),
      y - (rect.top + rect.height / 2)
    );
    
    if (distance < 40) {
      if (!this.state.get('sos.startTime')) {
        this.state.set('sos.startTime', performance.now());
      }
      const elapsed = performance.now() - this.state.get('sos.startTime');
      const progress = Math.min(1, elapsed / 3000);
      const sosc = document.getElementById('sosc');
      if (sosc) sosc.style.strokeDashoffset = 164 * (1 - progress);
      
      if (progress >= 1) {
        this.state.set('sos.startTime', null);
        this.triggerSOS();
      }
    } else {
      this.state.set('sos.startTime', null);
      const sosc = document.getElementById('sosc');
      if (sosc) sosc.style.strokeDashoffset = 164;
    }
  }

  triggerSOS() {
    const sosm = document.getElementById('sosm');
    if (sosm) {
      sosm.style.display = 'flex';
      sosm.classList.add('on');
    }
    if (typeof VoiceManager !== 'undefined') VoiceManager.speak('تم تفعيل وضع الطوارئ.');
    this.dwell = null;
    this.state.set('sos.active', true);
  }

  closeSOS() {
    const sosm = document.getElementById('sosm');
    if (sosm) {
      sosm.classList.remove('on');
      setTimeout(() => { sosm.style.display = 'none'; }, 300);
    }
    this.state.set('sos.active', false);
  }

  /* ── Navigation ── */
  home() {
    if (this.dwell && this.dwell.destroy) this.dwell.destroy();
    if (typeof VoiceManager !== 'undefined') VoiceManager.stop();
    clearTimeout(this.hesitationTimeout);
    this._hideHint();
    this.showScreen('w');
  }

  retry() {
    if (!this.state.get('quiz.subject')) return;
    if (typeof DB === 'undefined') return;
    
    const questions = DB.getQuestions(this.state.get('quiz.subject'), CONFIG.QUIZ.QUESTIONS_PER_ROUND);
    
    this.state.set('quiz.questions', questions);
    this.state.set('quiz.index', 0);
    this.state.set('quiz.score', 0);
    this.state.set('quiz.hesitations', 0);
    this.state.set('quiz.startTime', Date.now());
    
    this.showQuestion();
  }

  adjustDwell(delta) {
    const newTime = this.state.get('dwell.ms') + delta;
    const clamped = Math.max(CONFIG.DWELL.MIN_MS, Math.min(CONFIG.DWELL.MAX_MS, newTime));
    this.state.set('dwell.ms', clamped);
    
    if (this.dwell && this.dwell.setDwellTime) {
      this.dwell.setDwellTime(clamped);
    }
    
    const dv = document.getElementById('dv');
    if (dv) dv.textContent = (clamped / 1000).toFixed(1) + 's';
  }
}

// Initialize app when DOM is ready
const App = new EnsafApp();

async function initializeApp() {
  if (window.SCREENS_READY) {
    await window.SCREENS_READY;
  }
  App.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}