class EnsafApp {
  constructor() {
    this.state = STATE;
    this.tracker = null;
    this.dwell = null;
    this.hesitationTimeout = null;
  }

  init() {
    // Hide loader after animation
    setTimeout(() => {
      document.getElementById('load')?.classList.add('out');
    }, 1600);
    
    // Setup event listeners
    document.getElementById('dm').onclick = () => this.adjustDwell(-500);
    document.getElementById('dp').onclick = () => this.adjustDwell(+500);
    document.getElementById('sos').onclick = () => this.triggerSOS();
    
    // Mode buttons
    document.querySelectorAll('.mbtn').forEach(btn => {
      btn.onclick = () => this.setMode(btn.dataset.mode, btn);
    });
  }

  setMode(mode, button) {
    this.state.set('mode', mode);
    document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('act'));
    button?.classList.add('act');
    
    if (mode === 'mouse') {
      document.getElementById('fb').classList.add('on');
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

  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: CONFIG.CAMERA.WIDTH,
          height: CONFIG.CAMERA.HEIGHT,
          facingMode: CONFIG.CAMERA.FACING_MODE
        }
      });
      
      const video = document.getElementById('vcam');
      video.srcObject = stream;
      video.classList.add('show');
      
      // Initialize tracker based on mode
      const mode = this.state.get('mode');
      if (mode === 'head') {
        this.tracker = new HeadTracker();
      } else if (mode === 'eye') {
        this.tracker = new EyeTracker();
      }
      
      if (this.tracker) {
        await this.tracker.startCamera(video);
        this.tracker.onUpdate((x, y, conf, tracking) => {
          this._onTrackingUpdate(x, y, conf, tracking);
        });
        
        document.getElementById('cursor').classList.add('on');
        this._showUI();
        this.showScreen('s');
        this.buildSubjectsGrid();
        
        Voice.speak('نظام التتبع جاهز. اختر مادة دراسية.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      this._switchToMouse();
    }
  }

  _onTrackingUpdate(x, y, confidence, tracking) {
    // Update cursor
    const cursor = document.getElementById('cursor');
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    
    // Update status bar
    const statusDot = document.getElementById('bdot');
    const statusText = document.getElementById('bst');
    const confFill = document.getElementById('cff');
    
    confFill.style.width = (confidence * 100) + '%';
    
    if (tracking && confidence > 0.55) {
      cursor.classList.remove('low');
      statusDot.className = 'dot ok';
      statusText.textContent = 'التتبع نشط';
    } else if (tracking && confidence > 0.25) {
      cursor.classList.add('low');
      statusDot.className = 'dot wn';
      statusText.textContent = 'إشارة ضعيفة';
    } else {
      cursor.classList.remove('low');
      statusDot.className = 'dot';
      statusText.textContent = 'لا يوجد وجه';
    }
    
    // Update dwell
    if (this.dwell) {
      this.dwell.update(x, y);
    }
    
    // Check SOS
    this._checkSOS(x, y);
  }

  _setupMouseMode() {
    const cursor = document.getElementById('cursor');
    cursor.classList.add('on');
    
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      
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
    this.setMode('mouse', document.getElementById('mm'));
    this._setupMouseMode();
    this.showScreen('s');
    this.buildSubjectsGrid();
  }

  _showUI() {
    document.getElementById('bar').classList.add('show');
    document.getElementById('sos').classList.add('show');
    document.getElementById('sosa').classList.add('show');
    document.getElementById('vi').style.display = 'flex';
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
    document.getElementById(targetId)?.classList.add('on');
    this.state.set('screen', screenId);
  }

  buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid) return;
    
    grid.innerHTML = DB.subjects.map(s => `
      <div class="scard" data-c="${s.color}" data-id="${s.id}">
        <svg class="dsvg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect class="drect" x="1.5" y="1.5" width="97" height="97" rx="19"/>
        </svg>
        <div class="sem">${s.emoji}</div>
        <div class="snm">${s.name}</div>
        <div class="sct">5 أسئلة</div>
      </div>
    `).join('');
    
    // Setup dwell
    if (this.dwell) this.dwell.destroy();
    
    const cards = Array.from(grid.querySelectorAll('.scard'));
    this.dwell = new DwellSystem({
      onSelect: (id) => this.selectSubject(id),
      onProgress: (id, progress, active) => {
        const el = grid.querySelector(`[data-id="${id}"]`);
        if (!el) return;
        el.classList.toggle('gz', active);
        const rect = el.querySelector('.drect');
        if (rect) rect.style.strokeDashoffset = active ? 1000 * (1 - progress) : 1000;
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
    
    const questions = [...DB.q[subjectId]];
    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    
    this.state.set('quiz.questions', questions);
    this.state.set('quiz.index', 0);
    this.state.set('quiz.score', 0);
    this.state.set('quiz.hesitations', 0);
    this.state.set('quiz.startTime', Date.now());
    
    const subject = DB.subjects.find(s => s.id === subjectId);
    Voice.speak(`اخترت ${subject.name}. سيبدأ الاختبار الآن.`);
    
    setTimeout(() => this.showQuestion(), 500);
  }

  showQuestion() {
    const index = this.state.get('quiz.index');
    const questions = this.state.get('quiz.questions');
    
    if (index >= questions.length) {
      this.showResult();
      return;
    }
    
    this.showScreen('q');
    this._hideHint();
    
    const q = questions[index];
    const subject = DB.subjects.find(s => s.id === this.state.get('quiz.subject'));
    const total = questions.length;
    
    document.getElementById('qc').textContent = `السؤال ${index + 1} من ${total}`;
    document.getElementById('qpf').style.width = `${(index / total) * 100}%`;
    document.getElementById('qpts').textContent = `⭐ ${this.state.get('quiz.score')}`;
    document.getElementById('qtag').textContent = `${subject.emoji} ${subject.name}`;
    document.getElementById('qtxt').textContent = q.q;
    
    const answersGrid = document.getElementById('agrid');
    const letters = ['أ', 'ب', 'ج', 'د'];
    answersGrid.innerHTML = q.opts.map((opt, i) => `
      <div class="abtn" data-i="${i}">
        <div class="altr">${letters[i]}</div>
        <div class="atxt">${opt}</div>
        <div class="adw"><div class="adwf" id="df${i}"></div></div>
      </div>
    `).join('');
    
    Voice.speak(q.q);
    
    // Setup dwell for answers
    if (this.dwell) this.dwell.destroy();
    
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
    
    const q = this.state.get('quiz.questions')[this.state.get('quiz.index')];
    const correct = index === q.ans;
    
    document.querySelectorAll('.abtn').forEach((btn, i) => {
      if (i === q.ans) btn.classList.add('ok');
      else if (i === index && !correct) btn.classList.add('no');
    });
    
    if (correct) {
      this.state.set('quiz.score', this.state.get('quiz.score') + 1);
      Voice.speak('إجابة صحيحة!');
    } else {
      Voice.speak(`الإجابة الصحيحة هي: ${q.opts[q.ans]}`);
    }
    
    setTimeout(() => {
      this.state.set('quiz.index', this.state.get('quiz.index') + 1);
      this.showQuestion();
    }, CONFIG.QUIZ.ANSWER_DELAY);
  }

  _showHint(hint) {
    document.getElementById('htxt').textContent = hint;
    document.getElementById('hint').classList.add('on');
    Voice.speak('تلميح: ' + hint);
  }

  _hideHint() {
    document.getElementById('hint').classList.remove('on');
  }

  showResult() {
    this.showScreen('r');
    this.dwell = null;
    
    const score = this.state.get('quiz.score');
    const total = this.state.get('quiz.questions').length;
    const percent = Math.round((score / total) * 100);
    const duration = Math.round((Date.now() - this.state.get('quiz.startTime')) / 1000);
    const subject = DB.subjects.find(s => s.id === this.state.get('quiz.subject'));
    const hesitations = this.state.get('quiz.hesitations');
    
    // Determine results
    let emoji, label, message;
    if (percent >= 90) {
      emoji = '🏆'; label = 'أداء استثنائي!'; message = 'عمل مثالي!';
    } else if (percent >= 70) {
      emoji = '⭐'; label = 'ممتاز!'; message = 'عمل رائع!';
    } else if (percent >= 50) {
      emoji = '👍'; label = 'جيد!'; message = 'استمر في التدريب.';
    } else {
      emoji = '💪'; label = 'استمر في المحاولة!'; message = 'راجع المادة وحاول مجدداً.';
    }
    
    document.getElementById('rb').textContent = emoji;
    document.getElementById('rs').textContent = percent + '%';
    document.getElementById('rl').textContent = label;
    document.getElementById('ru').textContent = `أجبت على ${score} من ${total} بشكل صحيح`;
    
    document.getElementById('rst').innerHTML = `
      <div class="rstat"><div class="rsv">${score}/${total}</div><div class="rsl">صحيح</div></div>
      <div class="rstat"><div class="rsv">${duration}ث</div><div class="rsl">المدة</div></div>
      <div class="rstat"><div class="rsv">${hesitations}</div><div class="rsl">تلميحات</div></div>
    `;
    
    document.getElementById('rrep').innerHTML = `
      <div class="rrow"><span class="rlb">المادة</span><span class="rvl">${subject.emoji} ${subject.name}</span></div>
      <div class="rrow"><span class="rlb">النتيجة</span><span class="rvl ${percent >= 70 ? 'g' : 'w'}">${percent}%</span></div>
      <div class="rrow"><span class="rlb">متوسط وقت السؤال</span><span class="rvl">${Math.round(duration / total)}ث</span></div>
      <div class="rrow"><span class="rlb">طريقة التفاعل</span><span class="rvl">${this.state.get('mode') === 'head' ? '🎯 تتبع الرأس' : this.state.get('mode') === 'eye' ? '👁️ تتبع العين' : '🖱️ الماوس'}</span></div>
    `;
    
    Voice.speak(`انتهى الاختبار. حصلت على ${percent} بالمئة. ${message}`);
    
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

  showLesson() {
    const lessons = DB.lessons[this.state.get('quiz.subject')] || DB.lessons.math;
    let lessonIndex = 0;
    
    const showLesson = (idx) => {
      this.showScreen('l');
      const lesson = lessons[idx];
      
      document.getElementById('lc').textContent = `الدرس ${idx + 1} من ${lessons.length}`;
      document.getElementById('lpf').style.width = `${((idx + 1) / lessons.length) * 100}%`;
      document.getElementById('lbox').innerHTML = `
        <div class="ltit">${lesson.title}</div>
        <div class="lp">${lesson.body}</div>
      `;
      
      const nav = document.getElementById('lnav');
      nav.innerHTML = `
        ${idx > 0 ? `<button class="lbtn" data-a="prev">← السابق</button>` : ''}
        <div class="lsep"></div>
        ${idx < lessons.length - 1 ? 
          `<button class="lbtn pri" data-a="next">التالي →</button>` : 
          `<button class="lbtn pri" data-a="quiz">اختبار ✏️</button>`}
      `;
      
      Voice.speak(lesson.title + '. ' + lesson.body.replace(/<[^>]+>/g, ''));
      
      if (this.dwell) this.dwell.destroy();
      
      const navBtns = Array.from(nav.querySelectorAll('.lbtn'));
      this.dwell = new DwellSystem({
        onSelect: (action) => {
          if (action === 'next') showLesson(idx + 1);
          else if (action === 'prev') showLesson(idx - 1);
          else {
            this.state.set('quiz.index', 0);
            this.state.set('quiz.score', 0);
            this.state.set('quiz.hesitations', 0);
            this.state.set('quiz.startTime', Date.now());
            this.showQuestion();
          }
        },
        onProgress: (action, progress, active) => {
          const btn = nav.querySelector(`[data-a="${action}"]`);
          if (btn) btn.classList.toggle('gz', active);
        }
      });
      
      this.dwell.setDwellTime(this.state.get('dwell.ms'));
      this.dwell.setItems(navBtns.map(btn => ({ id: btn.dataset.a, element: btn })));
    };
    
    showLesson(0);
  }

  /* ── SOS System ── */
  _checkSOS(x, y) {
    const sosBtn = document.getElementById('sos');
    if (!sosBtn.classList.contains('show')) return;
    
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
      document.getElementById('sosc').style.strokeDashoffset = 164 * (1 - progress);
      
      if (progress >= 1) {
        this.state.set('sos.startTime', null);
        this.triggerSOS();
      }
    } else {
      this.state.set('sos.startTime', null);
      document.getElementById('sosc').style.strokeDashoffset = 164;
    }
  }

  triggerSOS() {
    document.getElementById('sosm').classList.add('on');
    Voice.speak('تم تفعيل وضع الطوارئ.');
    this.dwell = null;
    this.state.set('sos.active', true);
  }

  closeSOS() {
    document.getElementById('sosm').classList.remove('on');
    this.state.set('sos.active', false);
  }

  /* ── Navigation ── */
  home() {
    if (this.dwell) this.dwell.destroy();
    Voice.stop();
    clearTimeout(this.hesitationTimeout);
    this._hideHint();
    this.showScreen('w');
  }

  retry() {
    if (!this.state.get('quiz.subject')) return;
    
    const questions = [...DB.q[this.state.get('quiz.subject')]];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    
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
    
    if (this.dwell) {
      this.dwell.setDwellTime(clamped);
    }
    
    document.getElementById('dv').textContent = (clamped / 1000).toFixed(1) + 's';
  }
}

// Voice singleton
const Voice = (() => {
  const synth = window.speechSynthesis;
  
  function speak(text) {
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = CONFIG.VOICE.LANG;
    utterance.rate = CONFIG.VOICE.RATE;
    utterance.pitch = CONFIG.VOICE.PITCH;
    
    const vi = document.getElementById('vi');
    utterance.onstart = () => vi?.classList.add('on');
    utterance.onend = () => vi?.classList.remove('on');
    
    synth.speak(utterance);
  }
  
  function stop() {
    synth?.cancel();
    document.getElementById('vi')?.classList.remove('on');
  }
  
  return { speak, stop };
})();

// Initialize app
const App = new EnsafApp();
document.addEventListener('DOMContentLoaded', () => App.init());