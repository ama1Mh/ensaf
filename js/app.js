/**
 * ENSAF main application.
 *
 * Responsibilities (each section is marked below):
 *   1. Boot: settings, theme, language, icons, router guard, auth
 *   2. Input: head / eye tracker or mouse → cursor → DwellController
 *   3. Top bar, settings dialog, SOS dialog, calibration
 *   4. Auth screens (login / register / guest) and profile
 *   5. Learning flow: subjects → lesson → quiz (hint after hesitation) → report
 *
 * Every selection gives the same feedback: visual state + voice + optional
 * sound. All visible text comes from js/i18n/translations.js.
 */

// Firebase auth error codes that AuthManager does not map itself.
const AUTH_CODE_KEYS = {
  'missing-fields': 'authErrMissingFields',
  'firebase-unavailable': 'authErrUnavailable',
  'reset-unavailable': 'authErrUnavailable',
  'auth/missing-email': 'authErrMissingEmail',
  'timeout': 'authErrNetwork'
};

const LEARNING_SCREENS = ['permission', 'subjects', 'question', 'lesson', 'result'];
const SOS_SCREENS = new Set(['sp', 'ss', 'sq', 'sl', 'sr']);
const THEMES = ['light', 'dark', 'contrast'];

class EnsafApp {
  constructor() {
    this.state = STATE;
    this.auth = null;
    this.tracker = null;
    this.stream = null;
    this.inputReady = false;       // a working input mode has been set up
    this.answerLocked = false;     // prevents double answers
    this._authBusy = false;
    this._applyingRemote = false;
    this._toastTimer = null;
    this._lastFaceToast = 0;
    this.lesson = { list: [], index: 0 };
    this.hesitation = new HesitationTimer({
      timeoutMs: CONFIG.QUIZ.HESITATION_TIMEOUT,
      onHesitate: () => this._onHesitate()
    });
  }

  // ═══ i18n helpers ═════════════════════════════════════════════
  get language() { return I18N.lang; }
  t(key, vars) { return I18N.t(key, vars); }
  icon(name) { return `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`; }
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  speak(text) { VoiceManager.speak(text); }
  announce(text) {
    const live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 30);
  }

  // ═══ 1. Boot ══════════════════════════════════════════════════
  init() {
    const s = Settings.load();
    this._watchIcons();
    this.applyTheme(s.theme);
    document.documentElement.style.setProperty('--text-scale', s.textScale);
    VoiceManager.setEnabled(s.voice);
    VoiceManager.setRate(s.speechRate);
    Sounds.setEnabled(s.sounds);
    VoiceManager.on('start', () => document.getElementById('vi')?.classList.add('speaking'));
    VoiceManager.on('end', () => document.getElementById('vi')?.classList.remove('speaking'));
    VoiceManager.on('missing', () => this.toast(this.t('voiceUnavailable'), 'info', 8000));

    DwellController.init({ dwellMs: s.dwellMs, cursor: document.getElementById('cursor') });
    DwellController.onSelect = () => Sounds.play('select');

    this._bindTopBar();
    this._bindSettings();
    this._bindSOS();
    this._bindCalibration();
    this._bindKeyboard();
    this._bindLanding();
    this._bindAuthForms();
    this._bindProfile();
    this._bindPermission();
    this._bindResult();
    this._bindPointer();

    this.setLanguage(s.lang);
    this._renderMode();
    this._setStatus('statusTrackingOff', 'off');
    Settings.onChange((data, changed) => this._onSettingsChange(data, changed));

    // Auth + router: start routing once we know whether a session exists
    // (or after 2.5 s — offline/blocked Firebase must not block the app).
    this.auth = new AuthManager();
    this.auth.onChange((user, reason) => this._onAuthChange(user, reason));
    const ready = this.auth.init();
    ROUTER.guard = (name) => this._guard(name);
    EVENTS.on(EVENT_NAMES.SCREEN_CHANGE, ({ screen }) => this._onScreenChange(screen));
    Promise.race([ready, new Promise(r => setTimeout(r, 2500))]).then(() => {
      this.renderUserState();
      ROUTER.start();
      document.getElementById('load')?.classList.add('out');
    });

    this._maybeResumeTracking();
  }

  _watchIcons() {
    // Hide icon ligature text until the icon font is ready; drop icons if it fails.
    const html = document.documentElement;
    const markReady = () => { html.classList.add('icons-ready'); html.classList.remove('icons-failed'); };
    const fail = setTimeout(() => { if (!html.classList.contains('icons-ready')) html.classList.add('icons-failed'); }, 6000);
    if (document.fonts && document.fonts.load) {
      document.fonts.load('24px "Material Symbols Outlined"', 'home')
        .then(f => { if (f && f.length) { clearTimeout(fail); markReady(); } })
        .catch(() => {});
    }
    // Icons are decorative: make sure screen readers never read "volume_up".
    const hide = rootEl => rootEl.querySelectorAll?.('.material-symbols-outlined:not([aria-hidden])').forEach(el => el.setAttribute('aria-hidden', 'true'));
    hide(document);
    new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { hide(n); if (n.matches?.('.material-symbols-outlined')) n.setAttribute('aria-hidden', 'true'); } })))
      .observe(document.body, { childList: true, subtree: true });
  }

  setLanguage(lang) {
    const l = I18N.setLang(lang);
    VoiceManager.setLang(I18N.speechLangFor(l));
    this.translateUI();
    // Re-render dynamic content in the new language.
    const screen = this.state.get('screen');
    if (screen === 'subjects') this.buildSubjectsGrid();
    else if (screen === 'question') this.showQuestion({ rerender: true });
    else if (screen === 'lesson') this._renderLesson();
    else if (screen === 'result') this.showResult({ rerender: true });
    else if (screen === 'profile') this._populateProfile();
  }

  translateUI() {
    I18N.apply(document);
    document.title = `${this.language === 'ar' ? 'إنصاف' : 'ENSAF'} — ${this.t('landingLogoSub')}`;
    document.querySelectorAll('#lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === this.language)));
    this._renderTopBar();
    this._renderMode();
    this._renderSettings();
    this.renderUserState();
    // Icon-only top-bar buttons: tooltip = their (visually hidden) label.
    document.querySelectorAll('#bar .icon-btn').forEach(b => {
      const l = b.querySelector('.btn-label');
      if (l) b.title = l.textContent;
    });
  }

  applyTheme(theme) {
    const t = THEMES.includes(theme) ? theme : 'light';
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast', 'theme-warm');
    document.body.classList.add(`theme-${t}`);
  }

  _guard(name) {
    const user = this.auth && this.auth.getUser();
    if (LEARNING_SCREENS.includes(name) && !user) return 'login';
    if (name === 'profile' && (!user || user.isGuest)) return 'login';
    if (['subjects', 'question', 'lesson', 'result'].includes(name) && !this.inputReady) return 'permission';
    const q = this.state.get('quiz.questions') || [];
    if ((name === 'question' || name === 'result') && !q.length) return 'subjects';
    if (name === 'lesson' && !this.lesson.list.length) return 'subjects';
    return name;
  }

  _onScreenChange(domId) {
    const names = { sw: 'welcome', sp: 'permission', ss: 'subjects', sq: 'question', sl: 'lesson', sr: 'result', login: 'login', profile: 'profile' };
    const name = names[domId] || domId;
    this.state.set('screen', name);
    DwellController.disarm();
    if (name !== 'question') { this.hesitation.stop(); this._hideHint(); }
    document.getElementById('sos')?.classList.toggle('show', SOS_SCREENS.has(domId));
    if (name === 'login') this._onLoginShown();
    // If the language changed while this screen was on its way in, re-render it.
    const stale = id => { const el = document.getElementById(id); return el && el.dataset.lang !== this.language; };
    if (name === 'subjects' && (!document.querySelector('#sgrid .scard') || stale('sgrid'))) this.buildSubjectsGrid();
    if (name === 'question' && stale('agrid')) this.showQuestion({ rerender: true });
    if (name === 'lesson' && stale('lbox')) this._renderLesson();
    if (name === 'result' && stale('rrep')) this.showResult({ rerender: true });
    if (name === 'profile') this._populateProfile();
    // Move focus to the screen heading so keyboard / screen-reader users start at the top.
    const scr = document.getElementById(domId);
    const heading = scr && scr.querySelector('h1');
    if (heading && name !== 'welcome') {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  showScreen(name) {
    const legacy = { w: 'welcome', p: 'permission', s: 'subjects', q: 'question', l: 'lesson', r: 'result' };
    ROUTER.navigate(legacy[name] || name);
  }

  // ═══ 2. Input: tracker / mouse → cursor → dwell ═══════════════
  _bindPointer() {
    this.cursor = document.getElementById('cursor');
    this._mouse = null;
    document.addEventListener('mousemove', e => {
      if (this.tracker) return;   // head/eye mode owns the cursor
      if (!Settings.get('mouseDwell')) return;
      this._mouse = { x: e.clientX, y: e.clientY };
      this._pointer(e.clientX, e.clientY);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { this._mouse = null; if (!this.tracker) DwellController.update(-1, -1); });
    // A resting mouse sends no events, but dwell must keep counting: re-feed the
    // last position ~30×/s (head/eye trackers already stream positions).
    setInterval(() => {
      if (this.tracker || !this._mouse || !Settings.get('mouseDwell') || document.hidden) return;
      DwellController.update(this._mouse.x, this._mouse.y);
    }, 33);
  }

  _pointer(x, y) {
    if (this.cursor) {
      this.cursor.classList.add('on');
      this.cursor.style.transform = `translate(${x}px, ${y}px)`;
    }
    DwellController.update(x, y);
  }

  _renderMode() {
    const mode = Settings.get('mode');
    const ind = document.getElementById('mode-indicator');
    const icons = { head: 'face', eye: 'visibility', mouse: 'mouse' };
    const labels = { head: 'modeHeadShort', eye: 'modeEyeShort', mouse: 'modeMouseShort' };
    if (ind) ind.innerHTML = `${this.icon(icons[mode])}<span>${this.esc(this.t(labels[mode]))}</span>`;
    document.getElementById('recal-btn').hidden = !this.tracker;
    document.querySelectorAll('.mbtn').forEach(b => b.classList.toggle('act', b.dataset.mode === mode));
    if (!this.tracker && this.cursor && (mode !== 'mouse' || !Settings.get('mouseDwell'))) this.cursor.classList.remove('on');
  }

  _setStatus(key, cls) {
    const st = document.getElementById('bst');
    const dot = document.getElementById('bdot');
    if (st) { st.dataset.i18n = key; st.textContent = this.t(key); }
    if (dot) dot.className = `dot ${cls || ''}`;
  }

  async _maybeResumeTracking() {
    // If the student already allowed the camera before, restart tracking on load
    // so they can use the whole app (including login) hands-free.
    const mode = Settings.get('mode');
    if (mode === 'mouse' || !navigator.permissions?.query) return;
    try {
      const p = await navigator.permissions.query({ name: 'camera' });
      if (p.state === 'granted') this.requestCamera(mode, { navigate: false, quiet: true });
    } catch (e) { /* not supported */ }
  }

  /** Entry point for the mode cards on the permission screen. */
  chooseMode(mode) {
    if (mode === 'mouse') { this.useMouse(); return; }
    this.requestCamera(mode, { navigate: true });
  }

  useMouse({ navigate = true } = {}) {
    this.stopTracking();
    Settings.set({ mode: 'mouse' });
    this.inputReady = true;
    this._setStatus('statusMouse', 'ok');
    this._renderMode();
    // Brief notice only, so it never covers buttons (the mode stays visible in the top bar).
    const fb = document.getElementById('fb');
    if (fb && Settings.get('mouseDwell')) { fb.classList.add('on'); clearTimeout(this._fbTimer); this._fbTimer = setTimeout(() => fb.classList.remove('on'), 4000); }
    if (navigate) this.showScreen('subjects');
  }

  async requestCamera(mode, { navigate = true, quiet = false } = {}) {
    if (this._cameraStarting) return;
    this._cameraStarting = true;
    const permStatus = document.getElementById('perm-status');
    if (permStatus) permStatus.textContent = this.t('cameraStarting');
    this._setStatus('cameraStarting', 'wn');
    this.stopTracking();
    Settings.set({ mode });

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: CONFIG.CAMERA.WIDTH }, height: { ideal: CONFIG.CAMERA.HEIGHT }, facingMode: CONFIG.CAMERA.FACING_MODE, frameRate: { ideal: CONFIG.CAMERA.FRAMERATE } },
        audio: false
      });
    } catch (err) {
      this._cameraStarting = false;
      const key = (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) ? 'cameraDenied'
        : (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError' || err.name === 'TypeError')) ? 'cameraMissing'
        : (err && err.name === 'NotReadableError') ? 'cameraBusy' : 'cameraMissing';
      console.info('[ENSAF] camera unavailable:', err && err.name);
      if (quiet) { this._quietFail(); return; }
      this._fallbackToMouse(key, { navigate, quiet });
      return;
    }

    const video = document.getElementById('vcam');
    video.srcObject = this.stream;
    try { await video.play(); } catch (e) { /* autoplay with muted is allowed */ }

    const tracker = new FaceTracker({
      mode,
      getSettings: () => Settings.get(),
      onPoint: (x, y, info) => this._onTrackerPoint(x, y, info),
      onStatus: s => this._onTrackerStatus(s)
    });
    try {
      await tracker.start(video);
    } catch (err) {
      console.info('[ENSAF] tracker failed to load:', err && err.message);
      tracker.stop();
      this._cameraStarting = false;
      this.stopTracking();
      if (quiet) { this._quietFail(); return; }
      this._fallbackToMouse('trackerLoadFailed', { navigate, quiet });
      return;
    }
    this.tracker = tracker;
    this._cameraStarting = false;
    this.inputReady = true;
    video.classList.add('show');
    this.cursor.classList.add('on');
    if (permStatus) permStatus.textContent = '';
    this._setStatus('statusActive', 'ok');
    this._renderMode();
    if (!quiet) this.speak(this.t('voiceReady'));
    if (navigate) this.showScreen('subjects');
  }

  stopTracking() {
    if (this.tracker) { this.tracker.stop(); this.tracker = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    const video = document.getElementById('vcam');
    if (video) { video.classList.remove('show'); video.srcObject = null; }
    this._renderMode();
  }

  /** Silent auto-resume failed: leave the saved mode alone; the student picks a mode as usual. */
  _quietFail() {
    const permStatus = document.getElementById('perm-status');
    if (permStatus) permStatus.textContent = '';
    this._setStatus('statusTrackingOff', 'off');
  }

  _fallbackToMouse(messageKey, { navigate = true, quiet = false } = {}) {
    const permStatus = document.getElementById('perm-status');
    if (permStatus) permStatus.textContent = this.t(messageKey);
    this.useMouse({ navigate });
    if (!quiet) {
      this.toast(this.t(messageKey), 'warn', 10000);
      this.speak(this.t(messageKey));
    }
  }

  _onTrackerPoint(x, y, info) {
    const cff = document.getElementById('cff');
    if (cff) cff.style.width = `${Math.round(info.confidence * 100)}%`;
    this.cursor.classList.toggle('low', info.face && info.confidence < 0.55);
    this.cursor.classList.toggle('lost', !info.face);
    if (!info.face) { DwellController.update(-1, -1); return; }   // never select while the face is lost
    this._pointer(x, y);
  }

  _onTrackerStatus(status) {
    if (status === 'noface') {
      this._setStatus('statusNoFace', '');
      const now = Date.now();
      if (now - this._lastFaceToast > 15000) {
        this._lastFaceToast = now;
        this.toast(this.t('faceLost'), 'warn', 0, [
          { key: 'switchToMouse', run: () => this.useMouse({ navigate: false }) },
          { key: 'dismiss', run: () => this.hideToast() }
        ], 'face');
        this.speak(this.t('faceLost'));
      }
    } else if (status === 'face') {
      this._setStatus('statusActive', 'ok');
      if (this._toastTag === 'face') this.hideToast();
    } else if (status === 'lowlight') {
      this._setStatus('statusWeak', 'wn');
      this.toast(this.t('lowLight'), 'warn', 10000);
      this.speak(this.t('lowLight'));
    } else if (status === 'light-ok') {
      this._setStatus('statusActive', 'ok');
    }
  }

  recalibrate() {
    if (!this.tracker) return;
    this.speak(this.t('voiceRecalibrating'));
    // Give the student a moment to look straight at the screen, then re-centre.
    setTimeout(() => this.tracker && this.tracker.recenter(), 1500);
  }

  // ═══ Toast ════════════════════════════════════════════════════
  toast(message, type = 'info', ms = 6000, actions = [], tag = null) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(this._toastTimer);
    el.className = `on ${type}`;
    this._toastTag = tag;
    document.getElementById('toast-msg').textContent = message;
    const act = document.getElementById('toast-actions');
    act.innerHTML = '';
    const list = actions.length ? actions : [{ key: 'dismiss', run: () => this.hideToast() }];
    list.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bbtn';
      b.textContent = this.t(a.key);
      b.addEventListener('click', () => { a.run(); if (a.key !== 'dismiss') this.hideToast(); });
      act.appendChild(b);
    });
    if (ms > 0) this._toastTimer = setTimeout(() => this.hideToast(), ms);
  }

  hideToast() {
    const el = document.getElementById('toast');
    if (el) el.className = '';
    this._toastTag = null;
  }

  // ═══ 3. Top bar, settings, SOS, calibration ═══════════════════
  _bindTopBar() {
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    on('dm', () => Settings.step('dwellMs', -1));
    on('dp', () => Settings.step('dwellMs', +1));
    on('home-btn', () => this.home());
    on('settings-btn', () => this.openSettings());
    on('recal-btn', () => this.recalibrate());
    on('profile-btn', () => this.showProfile());
    on('logout-btn', () => this.signOut());
    on('vi', () => Settings.set({ voice: !Settings.get('voice') }));
    on('theme-btn', () => {
      const cur = Settings.get('theme');
      Settings.set({ theme: THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length] });
    });
    document.querySelectorAll('#lang-switch button').forEach(b => b.addEventListener('click', () => Settings.set({ lang: b.dataset.lang })));
  }

  _renderTopBar() {
    const s = Settings.get();
    const dv = document.getElementById('dv');
    if (dv) { dv.textContent = `${(s.dwellMs / 1000).toFixed(1)}s`; dv.setAttribute('aria-label', this.t('dwellValue', { s: (s.dwellMs / 1000).toFixed(1) })); }
    const themeKey = { light: 'themeLight', dark: 'themeDark', contrast: 'themeContrast' }[s.theme];
    const tl = document.getElementById('theme-btn-label');
    if (tl) { tl.dataset.i18n = themeKey; tl.textContent = this.t(themeKey); }
    document.getElementById('theme-btn')?.setAttribute('aria-label', this.t('themeSwitch', { theme: this.t(themeKey) }));
    const vi = document.getElementById('vi');
    if (vi) {
      vi.setAttribute('aria-pressed', String(!s.voice));
      const ic = vi.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = s.voice ? 'volume_up' : 'volume_off';
    }
  }

  _bindSettings() {
    const dlg = document.getElementById('settings');
    dlg.querySelectorAll('.seg[data-setting] button').forEach(b => b.addEventListener('click', () => {
      const key = b.closest('[data-setting]').dataset.setting;
      let v = b.dataset.value;
      if (v === 'true' || v === 'false') v = v === 'true';
      if (key === 'mode') { this._switchModeInPlace(v); return; }
      Settings.set({ [key]: v });
    }));
    dlg.querySelectorAll('.stepper[data-setting] button').forEach(b => b.addEventListener('click', () => {
      Settings.step(b.closest('[data-setting]').dataset.setting, Number(b.dataset.step));
    }));
    document.getElementById('settings-close').addEventListener('click', () => dlg.close());
    document.getElementById('settings-done').addEventListener('click', () => dlg.close());
    document.getElementById('settings-reset').addEventListener('click', () => {
      Settings.reset();
      this.announce(this.t('settingsResetDone'));
      this.speak(this.t('settingsResetDone'));
    });
    dlg.addEventListener('close', () => { this.hesitation.resume(); DwellController.disarm(); });
  }

  openSettings() {
    const dlg = document.getElementById('settings');
    if (dlg.open) return;
    this._renderSettings();
    this.hesitation.pause();
    dlg.showModal();
    DwellController.disarm();
  }

  _switchModeInPlace(mode) {
    if (mode === Settings.get('mode') && (mode === 'mouse' ? !this.tracker : !!this.tracker)) return;
    if (mode === 'mouse') this.useMouse({ navigate: false });
    else this.requestCamera(mode, { navigate: false });
  }

  _renderSettings() {
    const s = Settings.get();
    const dlg = document.getElementById('settings');
    if (!dlg) return;
    dlg.querySelectorAll('.seg[data-setting]').forEach(g => {
      const v = String(s[g.dataset.setting]);
      g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
    });
    const fmt = {
      dwellMs: v => this.t('dwellValue', { s: (v / 1000).toFixed(1) }),
      sensitivity: v => this.t('percentValue', { n: Math.round(v * 100) }),
      steadiness: v => this.t('percentValue', { n: Math.round(v * 100) }),
      textScale: v => this.t('percentValue', { n: Math.round(v * 100) }),
      speechRate: v => this.t('percentValue', { n: Math.round(v * 100) })
    };
    dlg.querySelectorAll('.stepper[data-setting]').forEach(st => {
      const k = st.dataset.setting;
      const r = Settings.RANGES[k];
      st.querySelector('output').textContent = fmt[k](s[k]);
      st.querySelector('[data-step="-1"]').disabled = s[k] <= r.min;
      st.querySelector('[data-step="1"]').disabled = s[k] >= r.max;
    });
    const dm = document.getElementById('dm'); const dp = document.getElementById('dp');
    if (dm) dm.disabled = s.dwellMs <= Settings.RANGES.dwellMs.min;
    if (dp) dp.disabled = s.dwellMs >= Settings.RANGES.dwellMs.max;
  }

  _onSettingsChange(s, changed) {
    if (changed.includes('theme')) this.applyTheme(s.theme);
    if (changed.includes('textScale')) document.documentElement.style.setProperty('--text-scale', s.textScale);
    if (changed.includes('dwellMs')) DwellController.setDwellTime(s.dwellMs);
    if (changed.includes('voice')) VoiceManager.setEnabled(s.voice);
    if (changed.includes('speechRate')) { VoiceManager.setRate(s.speechRate); this.speak(this.t('settingsSpeechRate')); }
    if (changed.includes('sounds')) { Sounds.setEnabled(s.sounds); Sounds.play('select'); }
    if (changed.includes('steadiness') && this.tracker) this.tracker.applySettings();
    if (changed.includes('mouseDwell') && !s.mouseDwell && !this.tracker) { DwellController.update(-1, -1); this.cursor.classList.remove('on'); }
    if (changed.includes('lang')) this.setLanguage(s.lang);
    else { this._renderTopBar(); this._renderSettings(); this._renderMode(); }
    // Persist to the signed-in user's profile (debounced). Calibration stays on this device.
    if (!this._applyingRemote && this.auth && this.auth.getUser() && !this.auth.getUser().isGuest) {
      clearTimeout(this._prefTimer);
      this._prefTimer = setTimeout(() => {
        const { calibration, ...prefs } = Settings.get();
        this.auth.savePreferences(prefs).then(res => {
          if (res && res.success === false) console.warn('[ENSAF] could not save preferences:', res.code);
        });
      }, 1200);
    }
  }

  _bindSOS() {
    const sos = document.getElementById('sos');
    const dlg = document.getElementById('sosm');
    sos.addEventListener('click', () => this.triggerSOS());
    document.getElementById('sos-continue').addEventListener('click', () => this.closeSOS());
    document.getElementById('sos-home').addEventListener('click', () => { this.closeSOS(); this.home(); });
    dlg.addEventListener('cancel', () => this.closeSOS());
    dlg.addEventListener('close', () => { this.state.set('sos.active', false); DwellController.disarm(); });
  }

  triggerSOS() {
    const dlg = document.getElementById('sosm');
    if (dlg.open) return;
    document.getElementById('settings')?.open && document.getElementById('settings').close();
    this.hesitation.pause();
    this.state.set('sos.active', true);
    dlg.showModal();
    DwellController.disarm();
    Sounds.play('sos');
    this.speak(`${this.t('sosTitle')}. ${this.t('sosMessage')}`);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    EVENTS.emit(EVENT_NAMES.SOS_TRIGGER);
  }

  closeSOS() {
    const dlg = document.getElementById('sosm');
    if (dlg.open) dlg.close();
    VoiceManager.stop();
    this.hesitation.resume();
    EVENTS.emit(EVENT_NAMES.SOS_CLOSE);
  }

  _bindCalibration() {
    document.getElementById('calib-start').addEventListener('click', () => {
      document.getElementById('settings').close();
      this.calibrate();
    });
    document.getElementById('calib-reset').addEventListener('click', () => {
      Settings.set({ calibration: null });
      if (this.tracker) this.tracker._recentered = false;
      this.announce(this.t('calibrateRemoved'));
      this.speak(this.t('calibrateRemoved'));
    });
    document.getElementById('calib-cancel').addEventListener('click', () => { this._calibAbort = true; });
  }

  /** Optional 5-point calibration: centre + 4 corners, ~3 s per point. */
  async calibrate() {
    if (!this.tracker) {
      this.toast(this.t('calibrateNeedsCamera'), 'info');
      this.speak(this.t('calibrateNeedsCamera'));
      return;
    }
    const overlay = document.getElementById('calib');
    const dot = document.getElementById('calib-dot');
    const msg = document.getElementById('calib-msg');
    const points = [[0.5, 0.5], [0.12, 0.15], [0.88, 0.15], [0.88, 0.85], [0.12, 0.85]];
    const samples = [];
    this._calibAbort = false;
    overlay.classList.add('on');
    this.hesitation.pause();
    msg.textContent = this.t('calibrateIntro');
    this.speak(this.t('calibrateIntro'));
    await new Promise(r => setTimeout(r, 2500));
    const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

    for (let i = 0; i < points.length && !this._calibAbort; i++) {
      const [px, py] = points[i];
      dot.style.left = `${px * 100}%`;
      dot.style.top = `${py * 100}%`;
      dot.style.setProperty('--p', 0);
      msg.textContent = this.t('calibratePoint', { n: i + 1, total: points.length });
      const xs = [], ys = [];
      const start = performance.now();
      while (performance.now() - start < 2800 && !this._calibAbort) {
        await new Promise(r => setTimeout(r, 50));
        const el = performance.now() - start;
        dot.style.setProperty('--p', Math.min(1, el / 2800));
        const raw = this.tracker && this.tracker.getRaw();
        if (raw && el > 1000) { xs.push(raw.x); ys.push(raw.y); }   // skip the first second (eye/head travel)
      }
      if (xs.length < 5) { this._calibAbort = true; break; }
      samples.push({ px, py, x: median(xs), y: median(ys) });
    }

    overlay.classList.remove('on');
    this.hesitation.resume();
    DwellController.disarm();
    if (this._calibAbort || samples.length < 5) {
      if (samples.length < 5 && !this._calibAbort) this.toast(this.t('faceLost'), 'warn');
      return;
    }
    // Linear fit per axis: screen = 0.5 + (raw − centre) × gain.
    const c = samples[0];
    const gain = axis => {
      const pts = samples.slice(1);
      let num = 0, den = 0;
      pts.forEach(p => { const d = p[axis] - c[axis]; num += d * ((axis === 'x' ? p.px : p.py) - 0.5); den += d * d; });
      return den > 1e-9 ? num / den : null;
    };
    const sx = gain('x'), sy = gain('y');
    if (!sx || !sy || !isFinite(sx) || !isFinite(sy)) { this.toast(this.t('authErrUnknown'), 'warn'); return; }
    const mode = Settings.get('mode');
    Settings.set({ calibration: { [mode]: { cx: c.x, cy: c.y, sx, sy } } });
    this.tracker._recentered = false;
    this.tracker.filter.reset();
    this.toast(this.t('calibrateDone'), 'info');
    this.speak(this.t('calibrateDone'));
  }

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      // Number keys 1–4 answer the current question (another input method).
      if (this.state.get('screen') === 'question' && /^[1-4]$/.test(e.key) && !document.querySelector('dialog[open]')) {
        const btn = document.querySelector(`#agrid .abtn[data-i="${Number(e.key) - 1}"]`);
        if (btn) { e.preventDefault(); btn.click(); }
      }
    });
    // Any interaction unlocks audio (browsers block sound until a gesture).
    ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sounds.unlock(), { once: true }));
  }

  // ═══ Landing page behaviour (scripts inside fragments do not run) ═
  _bindLanding() {
    const sw = document.getElementById('sw');
    if (!sw) return;
    sw.querySelectorAll('.lnd-faq-q').forEach((btn, i) => {
      const item = btn.parentElement;
      const answer = item.querySelector('.lnd-faq-a');
      if (answer) { answer.id = answer.id || `faq-a-${i}`; btn.setAttribute('aria-controls', answer.id); }
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('open');
        sw.querySelectorAll('.lnd-faq-item.open').forEach(o => {
          o.classList.remove('open');
          o.querySelector('.lnd-faq-q').setAttribute('aria-expanded', 'false');
          o.querySelector('.lnd-faq-a').style.maxHeight = '';
        });
        if (open) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = `${answer.scrollHeight + 40}px`;
        }
      });
    });
    // In-page links scroll inside the landing screen instead of changing the route.
    sw.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const target = sw.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }));
    const form = sw.querySelector('.lnd-cform');
    if (form) {
      form.removeAttribute('onsubmit');
      form.onsubmit = null;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const st = form.querySelector('.lnd-cstatus');
        if (st) st.textContent = this.t('contactSubmitMsg');
        form.reset();
      });
    }
  }

  // ═══ 4. Auth screens and profile ══════════════════════════════
  start() {
    if (!this.auth || !this.auth.isSignedIn()) { this.showLogin(); return; }
    this.showScreen(this.inputReady ? 'subjects' : 'permission');
  }

  showLogin() { this.showScreen('login'); }

  showProfile() {
    const u = this.auth && this.auth.getUser();
    if (!u || u.isGuest) { this.showLogin(); return; }
    this.showScreen('profile');
  }

  async signOut() {
    if (this.auth) await this.auth.signOut();
    this.stopTracking();
    this.inputReady = false;
    this._setStatus('statusTrackingOff', 'off');
    this.announce(this.t('authSignedOut'));
    this.showLogin();
  }

  renderUserState() {
    const user = this.auth ? this.auth.getUser() : null;
    const signedIn = !!(user && !user.isGuest);
    const pb = document.getElementById('profile-btn');
    const lb = document.getElementById('logout-btn');
    if (pb) pb.hidden = !signedIn;
    if (lb) lb.hidden = !user;
  }

  _onAuthChange(user, reason) {
    this.renderUserState();
    if (user && !user.isGuest && (reason === 'profile' || reason === 'signed-in') && user.preferences) {
      // Apply the preferences saved in the account (calibration stays local).
      this._applyingRemote = true;
      const { calibration, ...prefs } = user.preferences;
      Settings.set(prefs);
      this._applyingRemote = false;
    }
    const screen = this.state.get('screen');
    if (!user && (LEARNING_SCREENS.includes(screen) || screen === 'profile') && ROUTER._started) this.showLogin();
  }

  _bindAuthForms() {
    const $ = id => document.getElementById(id);
    $('auth-tab-login')?.addEventListener('click', () => this._switchAuthTab('login'));
    $('auth-tab-register')?.addEventListener('click', () => this._switchAuthTab('register'));
    document.querySelector('#login .auth-tabs')?.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = document.activeElement.id === 'auth-tab-login' ? 'register' : 'login';
        this._switchAuthTab(next);
        $(`auth-tab-${next}`).focus();
      }
    });
    $('auth-login-form')?.addEventListener('submit', e => { e.preventDefault(); this.handleLogin(); });
    $('auth-register-form')?.addEventListener('submit', e => { e.preventDefault(); this.handleRegister(); });
    $('auth-forgot-btn')?.addEventListener('click', () => this.handlePasswordReset());
    $('auth-back-btn')?.addEventListener('click', () => this.home());
    $('auth-guest-btn')?.addEventListener('click', () => {
      this.auth.continueAsGuest();
      this.renderUserState();
      this.showScreen(this.inputReady ? 'subjects' : 'permission');
    });
    document.querySelectorAll('#login .pw-toggle').forEach(btn => btn.addEventListener('click', () => {
      const input = $(btn.getAttribute('aria-controls'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      const lbl = btn.querySelector('.pw-label');
      lbl.dataset.i18n = show ? 'authHidePassword' : 'authShowPassword';
      lbl.textContent = this.t(lbl.dataset.i18n);
      btn.querySelector('.material-symbols-outlined').textContent = show ? 'visibility_off' : 'visibility';
    }));
    document.querySelectorAll('#login .auth-input').forEach(inp => inp.addEventListener('input', () => this._fieldError(inp.id, null)));
  }

  _onLoginShown() {
    this._clearAuthStatus();
    if (!navigator.onLine) this._setAuthStatus(this.t('authErrOffline'), 'warning');
    else if (window.__firebaseFailed) this._setAuthStatus(this.t('authErrUnavailable'), 'warning');
  }

  _switchAuthTab(tab) {
    const isLogin = tab === 'login';
    const lt = document.getElementById('auth-tab-login');
    const rt = document.getElementById('auth-tab-register');
    lt.setAttribute('aria-selected', String(isLogin)); lt.tabIndex = isLogin ? 0 : -1;
    rt.setAttribute('aria-selected', String(!isLogin)); rt.tabIndex = isLogin ? -1 : 0;
    document.getElementById('auth-login-form').hidden = !isLogin;
    document.getElementById('auth-register-form').hidden = isLogin;
    this._clearAuthStatus();
    document.querySelectorAll('#login .field-error').forEach(e => { e.textContent = ''; e.classList.remove('on'); });
    document.querySelectorAll('#login .auth-input').forEach(i => i.removeAttribute('aria-invalid'));
  }

  _setAuthStatus(message, type = 'info', targetId = 'auth-status') {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.textContent = message;
    el.className = `auth-status ${type}`;
  }

  _clearAuthStatus(targetId = 'auth-status') {
    const el = document.getElementById(targetId);
    if (el) { el.textContent = ''; el.className = 'auth-status'; }
  }

  _fieldError(inputId, key) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(`${inputId}-err`);
    if (!input || !err) return;
    if (key) {
      input.setAttribute('aria-invalid', 'true');
      err.textContent = this.t(key);
      err.classList.add('on');
    } else {
      input.removeAttribute('aria-invalid');
      err.textContent = '';
      err.classList.remove('on');
    }
  }

  _authMessageKey(res) {
    if (!res) return 'authErrUnknown';
    if (res.errorKey && this.t(res.errorKey) !== res.errorKey) return res.errorKey;
    return AUTH_CODE_KEYS[res.code] || 'authErrUnknown';
  }

  _setBusy(formId, busy, labelKey) {
    const btn = document.querySelector(`#${formId} button[type=submit]`);
    if (!btn) return;
    btn.disabled = busy;
    btn.setAttribute('aria-busy', String(busy));
    const label = btn.querySelector('[data-i18n]');
    if (!btn.dataset.idleKey) btn.dataset.idleKey = label.dataset.i18n;
    label.dataset.i18n = busy ? labelKey : btn.dataset.idleKey;
    label.textContent = this.t(label.dataset.i18n);
  }

  /** Runs an auth call with a timeout so a blocked network never hangs the UI. */
  async _withTimeout(promise, ms = 15000) {
    return Promise.race([promise, new Promise(r => setTimeout(() => r({ success: false, code: 'timeout' }), ms))]);
  }

  _validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  async _runAuth(formId, busyKey, fn) {
    if (this._authBusy) return null;      // no double submits
    this._authBusy = true;
    this._clearAuthStatus();
    this._setBusy(formId, true, busyKey);
    this._setAuthStatus(this.t(busyKey), 'info');
    try {
      if (!navigator.onLine) return { success: false, errorKey: 'authErrOffline' };
      return await this._withTimeout(fn());
    } catch (e) {
      console.warn('[ENSAF] auth error', e);
      return { success: false, code: 'unknown' };
    } finally {
      this._authBusy = false;
      this._setBusy(formId, false, busyKey);
    }
  }

  _showAuthError(res) {
    const key = this._authMessageKey(res);
    this._setAuthStatus(this.t(key), 'error');
    this.speak(this.t(key));
    // Point the student at the field the error is about.
    const fieldFor = { authErrInvalidEmail: '-email', authErrEmailInUse: '-email', authErrWeakPassword: '-password', authErrInvalidCredentials: '-password' };
    const form = document.getElementById('auth-login-form').hidden ? 'register' : 'login';
    if (fieldFor[key]) this._fieldError(form + fieldFor[key], key);
  }

  async handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    let bad = false;
    this._fieldError('login-email', null); this._fieldError('login-password', null);
    if (!email) { this._fieldError('login-email', 'authErrMissingEmail'); bad = true; }
    else if (!this._validEmail(email)) { this._fieldError('login-email', 'authErrInvalidEmail'); bad = true; }
    if (!password) { this._fieldError('login-password', 'authErrMissingPassword'); bad = true; }
    if (bad) { this._focusFirstInvalid('auth-login-form'); return; }

    const res = await this._runAuth('auth-login-form', 'authSigningIn', () => this.auth.signIn(email, password));
    if (!res) return;
    if (!res.success) { this._showAuthError(res); return; }
    this._setAuthStatus(this.t('authSignedIn'), 'success');
    this.speak(this.t('authSignedIn'));
    this.renderUserState();
    setTimeout(() => this.start(), 600);
  }

  async handleRegister() {
    const v = id => document.getElementById(id).value;
    const name = v('register-name').trim(), email = v('register-email').trim();
    const password = v('register-password'), confirm = v('register-confirm');
    ['register-name', 'register-email', 'register-password', 'register-confirm'].forEach(id => this._fieldError(id, null));
    let bad = false;
    if (!name) { this._fieldError('register-name', 'authErrMissingName'); bad = true; }
    if (!email) { this._fieldError('register-email', 'authErrMissingEmail'); bad = true; }
    else if (!this._validEmail(email)) { this._fieldError('register-email', 'authErrInvalidEmail'); bad = true; }
    if (!password) { this._fieldError('register-password', 'authErrMissingPassword'); bad = true; }
    else if (password.length < 6) { this._fieldError('register-password', 'authErrWeakPassword'); bad = true; }
    if (password && confirm !== password) { this._fieldError('register-confirm', 'authPasswordMismatch'); bad = true; }
    if (bad) { this._focusFirstInvalid('auth-register-form'); return; }

    const res = await this._runAuth('auth-register-form', 'authCreating', () => this.auth.signUp(name, email, password));
    if (!res) return;
    if (!res.success) { this._showAuthError(res); return; }
    const msg = res.synced === false ? 'authSyncWarning' : 'authCreatedAccount';
    this._setAuthStatus(this.t(msg), res.synced === false ? 'warning' : 'success');
    this.speak(this.t(msg));
    this.renderUserState();
    setTimeout(() => this.start(), 900);
  }

  async handlePasswordReset() {
    const email = document.getElementById('login-email').value.trim();
    this._fieldError('login-email', null);
    if (!email) { this._fieldError('login-email', 'authErrMissingEmail'); this._focusFirstInvalid('auth-login-form'); return; }
    if (!this._validEmail(email)) { this._fieldError('login-email', 'authErrInvalidEmail'); this._focusFirstInvalid('auth-login-form'); return; }
    const res = await this._runAuth('auth-login-form', 'authSending', () => this.auth.sendPasswordReset(email));
    if (!res) return;
    if (!res.success) { this._showAuthError(res); return; }
    this._setAuthStatus(this.t('authResetSentMessage'), 'success');
    this.speak(this.t('authResetSentMessage'));
  }

  _focusFirstInvalid(formId) {
    const first = document.querySelector(`#${formId} [aria-invalid="true"]`);
    if (first) first.focus();
    const err = first && document.getElementById(`${first.id}-err`);
    if (err) this.speak(err.textContent);
  }

  _bindProfile() {
    document.getElementById('profile-close-btn')?.addEventListener('click', () => this.home());
    document.getElementById('profile-signout-btn')?.addEventListener('click', () => this.signOut());
    document.querySelectorAll('#profile .seg[data-profile] button').forEach(b => b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    document.getElementById('profile-save-btn')?.addEventListener('click', () => this._saveProfile());
  }

  _populateProfile() {
    const user = this.auth && this.auth.getUser();
    if (!user) return;
    const s = Settings.get();
    const w = document.getElementById('profile-welcome');
    if (w) w.textContent = this.t('authProfileWelcome', { name: user.name || '' });
    const em = document.getElementById('profile-email');
    if (em) em.textContent = user.email || this.t('authGuestEmail');
    document.querySelectorAll('#profile .seg[data-profile]').forEach(g => {
      const v = String(s[g.dataset.profile]);
      g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
    });
  }

  async _saveProfile() {
    const pick = k => document.querySelector(`#profile .seg[data-profile="${k}"] button[aria-pressed="true"]`)?.dataset.value;
    const patch = { mode: pick('mode'), theme: pick('theme'), lang: pick('lang') };
    const btn = document.getElementById('profile-save-btn');
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    this._setAuthStatus(this.t('authSaving'), 'info', 'profile-status');
    const modeChanged = patch.mode !== Settings.get('mode');
    this._applyingRemote = true;            // we save explicitly below
    Settings.set(patch);
    this._applyingRemote = false;
    const { calibration, ...prefs } = Settings.get();
    const res = await this._withTimeout(this.auth.savePreferences(prefs));
    btn.disabled = false; btn.setAttribute('aria-busy', 'false');
    if (res && res.success === false) this._setAuthStatus(this.t(this._authMessageKey(res)), 'error', 'profile-status');
    else { this._setAuthStatus(this.t('authPreferencesSaved'), 'success', 'profile-status'); this.speak(this.t('authPreferencesSaved')); }
    if (modeChanged && this.inputReady) this._switchModeInPlace(patch.mode);
  }

  _bindPermission() {
    document.querySelectorAll('#sp .mbtn').forEach(b => b.addEventListener('click', () => this.chooseMode(b.dataset.mode)));
  }

  // ═══ 5. Learning flow ═════════════════════════════════════════
  buildSubjectsGrid() {
    const grid = document.getElementById('sgrid');
    if (!grid || typeof DB === 'undefined') return;
    grid.innerHTML = DB.subjects.map(s => {
      const name = DB.localize(s.name, this.language);
      const n = DB.getQuestionCount(s.id);
      return `<button type="button" class="scard" data-id="${s.id}" aria-label="${this.esc(this.t('subjectCardLabel', { subject: name, n }))}">
        <span class="sem">${this.icon(s.icon)}</span>
        <span class="snm">${this.esc(name)}</span>
        <span class="sct">${this.esc(this.t('questionsCount', { n }))}</span>
      </button>`;
    }).join('');
    grid.dataset.lang = this.language;
    grid.querySelectorAll('.scard').forEach(card => card.addEventListener('click', () => this.selectSubject(card.dataset.id)));
  }

  selectSubject(subjectId) {
    if (this._selectingSubject) return;
    this._selectingSubject = true;
    setTimeout(() => { this._selectingSubject = false; }, 800);
    this.state.set('quiz.subject', subjectId);
    const subject = DB.getSubject(subjectId);
    this.speak(this.t('voiceChooseSubject', { subject: DB.localize(subject.name, this.language) }));
    this._prepareQuiz();
    this.lesson = { list: DB.lessons[subjectId] || [], index: 0 };
    setTimeout(() => (this.lesson.list.length ? this.showLesson() : this.showQuestion()), 400);
  }

  /** Picks the questions (kept unlocalised so a language switch can re-render them). */
  _prepareQuiz() {
    const subjectId = this.state.get('quiz.subject');
    const all = [...(DB.q[subjectId] || DB.q.math)];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    this.state.set('quiz.questions', all.slice(0, CONFIG.QUIZ.QUESTIONS_PER_ROUND));
    this.state.set('quiz.index', 0);
    this.state.set('quiz.score', 0);
    this.state.set('quiz.hesitations', 0);
    this.state.set('quiz.startTime', Date.now());
    this.state.set('quiz.answered', null);
  }

  _currentQuestion() {
    const qs = this.state.get('quiz.questions') || [];
    const raw = qs[this.state.get('quiz.index')];
    return raw ? DB.localizeQuestion(raw, this.language) : null;
  }

  showQuestion({ rerender = false } = {}) {
    const questions = this.state.get('quiz.questions') || [];
    const index = this.state.get('quiz.index');
    if (!questions.length) { this.showScreen('subjects'); return; }
    if (index >= questions.length) { this.showResult(); return; }
    if (!rerender) {
      this.answerLocked = false;
      this.state.set('quiz.answered', null);
      this.showScreen('question');
      this._hideHint();
    }
    const q = this._currentQuestion();
    const subject = DB.getSubject(this.state.get('quiz.subject'));
    const total = questions.length;
    const $ = id => document.getElementById(id);
    $('qc').textContent = this.t('questionCounter', { current: index + 1, total });
    const pct = Math.round((index / total) * 100);
    $('qpf').style.width = `${pct}%`;
    $('qprog').setAttribute('aria-valuenow', String(pct));
    const score = this.state.get('quiz.score');
    $('qpts').innerHTML = `${this.icon('star')}<span>${this.esc(this.t('pointsLabel', { n: score }))}</span>`;
    $('qtag').innerHTML = `${this.icon(subject ? subject.icon : 'menu_book')}<span>${this.esc(DB.localize(subject?.name, this.language))}</span>`;
    $('qtxt').textContent = q.q;

    const letters = this.language === 'ar' ? ['أ', 'ب', 'ج', 'د'] : ['A', 'B', 'C', 'D'];
    $('agrid').innerHTML = q.opts.map((opt, i) => `
      <button type="button" class="abtn" data-i="${i}" aria-label="${this.esc(this.t('answerOption', { letter: letters[i], text: opt }))}">
        <span class="altr" aria-hidden="true">${letters[i]}</span>
        <span class="atxt">${this.esc(opt)}</span>
        <span class="afb" aria-hidden="true"></span>
      </button>`).join('');
    $('agrid').dataset.lang = this.language;
    $('agrid').querySelectorAll('.abtn').forEach(btn => btn.addEventListener('click', () => this.selectAnswer(Number(btn.dataset.i))));

    const answered = this.state.get('quiz.answered');
    if (answered !== null && answered !== undefined) this._markAnswers(answered, q.ans);

    if (!rerender || answered === null) {
      // Read the question and the options aloud.
      const opts = q.opts.map((o, i) => `${letters[i]}: ${o}`).join('. ');
      this.speak(`${q.q}. ${opts}`);
    }
    if (!rerender) this.hesitation.start();
    if (rerender && document.getElementById('hint').classList.contains('on')) this._showHint(q.hint, { silent: true });
  }

  _markAnswers(chosen, correctIndex) {
    document.querySelectorAll('#agrid .abtn').forEach((btn, i) => {
      btn.setAttribute('aria-disabled', 'true');
      const fb = btn.querySelector('.afb');
      if (i === correctIndex) {
        btn.classList.add('ok');
        fb.innerHTML = `<span class="afb-icon">✓</span>${this.esc(this.t(i === chosen ? 'feedbackCorrect' : 'feedbackRightAnswer'))}`;
        fb.removeAttribute('aria-hidden');
      } else if (i === chosen) {
        btn.classList.add('no');
        fb.innerHTML = `<span class="afb-icon">✗</span>${this.esc(this.t('feedbackYourAnswer'))}`;
        fb.removeAttribute('aria-hidden');
      } else {
        btn.classList.add('dim');
      }
    });
  }

  selectAnswer(index) {
    if (this.answerLocked || this.state.get('screen') !== 'question') return;
    this.answerLocked = true;
    this.hesitation.stop();
    this._hideHint();
    const q = this._currentQuestion();
    const correct = index === q.ans;
    this.state.set('quiz.answered', index);
    this._markAnswers(index, q.ans);
    let message;
    if (correct) {
      this.state.set('quiz.score', this.state.get('quiz.score') + 1);
      message = this.t('voiceCorrectAnswer');
      Sounds.play('correct');
    } else {
      message = `${this.t('feedbackWrong')}. ${this.t('voiceWrongAnswerPrefix', { answer: q.opts[q.ans] })}`;
      Sounds.play('wrong');
    }
    document.getElementById('qpts').innerHTML = `${this.icon('star')}<span>${this.esc(this.t('pointsLabel', { n: this.state.get('quiz.score') }))}</span>`;
    this.announce(message);
    this.speak(message);
    EVENTS.emit(EVENT_NAMES.QUIZ_ANSWER, { index, correct });
    const qIndex = this.state.get('quiz.index');
    setTimeout(() => {
      if (this.state.get('screen') !== 'question' || this.state.get('quiz.index') !== qIndex) return;
      this.state.set('quiz.index', qIndex + 1);
      this.showQuestion();
    }, correct ? CONFIG.QUIZ.ANSWER_DELAY : CONFIG.QUIZ.ANSWER_DELAY + 1300);
  }

  _onHesitate() {
    if (this.state.get('screen') !== 'question' || this.answerLocked) return;
    const q = this._currentQuestion();
    if (!q || !q.hint) return;
    this.state.set('quiz.hesitations', this.state.get('quiz.hesitations') + 1);
    this._showHint(q.hint);
    EVENTS.emit(EVENT_NAMES.QUIZ_HINT, { hint: q.hint });
  }

  _showHint(hint, { silent = false } = {}) {
    if (!hint) return;
    document.getElementById('htxt').textContent = hint;
    document.getElementById('hint').classList.add('on');
    if (!silent) { Sounds.play('hint'); this.speak(this.t('hintVoice', { hint })); }
  }

  _hideHint() { document.getElementById('hint')?.classList.remove('on'); }

  showResult({ rerender = false } = {}) {
    const questions = this.state.get('quiz.questions') || [];
    if (!rerender) {
      this.state.set('quiz.durationMs', Date.now() - this.state.get('quiz.startTime'));
      this.showScreen('result');
    }
    const r = computeReport({
      score: this.state.get('quiz.score'),
      total: questions.length,
      durationMs: this.state.get('quiz.durationMs'),
      hints: this.state.get('quiz.hesitations')
    });
    const subject = DB.getSubject(this.state.get('quiz.subject'));
    const label = { excellent: 'gradeExcellent', good: 'gradeGood', fair: 'gradeFair', retry: 'gradeTryAgain' }[r.grade];
    const msg = { excellent: 'gradeMessageExcellent', good: 'gradeMessageGood', fair: 'gradeMessageGood', retry: 'gradeMessageRetry' }[r.grade];
    const $ = id => document.getElementById(id);
    const sec = this.t('timeSeconds');
    $('rb').innerHTML = `<span class="material-symbols-outlined icon-lg" aria-hidden="true">${r.icon}</span>`;
    $('rs').textContent = `${r.percent}%`;
    $('rs').setAttribute('aria-label', `${this.t('resultScoreLabel')}: ${r.percent}%`);
    $('rl').textContent = this.t(label);
    $('ru').textContent = this.t('resultCorrect', { score: r.score, total: r.total });
    $('rst').innerHTML = `
      <div class="rstat"><div class="rsv">${r.score}/${r.total}</div><div class="rsl">${this.esc(this.t('resultStatsCorrect'))}</div></div>
      <div class="rstat"><div class="rsv">${r.durationSec}${this.esc(sec)}</div><div class="rsl">${this.esc(this.t('resultStatsDuration'))}</div></div>
      <div class="rstat"><div class="rsv">${r.hints}</div><div class="rsl">${this.esc(this.t('resultStatsHints'))}</div></div>`;
    const modeKey = { head: 'modeHeadShort', eye: 'modeEyeShort', mouse: 'modeMouseShort' }[Settings.get('mode')];
    $('rrep').innerHTML = `
      <div class="rrow"><span class="rlb">${this.esc(this.t('resultSubject'))}</span><span class="rvl">${this.icon(subject ? subject.icon : 'menu_book')}${this.esc(DB.localize(subject?.name, this.language))}</span></div>
      <div class="rrow"><span class="rlb">${this.esc(this.t('resultScoreLabel'))}</span><span class="rvl ${r.passed ? 'g' : 'w'}">${r.passed ? '✓' : '!'} ${r.percent}% — ${this.esc(this.t(r.passed ? 'resultPassed' : 'resultNotPassed'))}</span></div>
      <div class="rrow"><span class="rlb">${this.esc(this.t('resultAvgPerQuestion'))}</span><span class="rvl">${r.avgSec}${this.esc(sec)}</span></div>
      <div class="rrow"><span class="rlb">${this.esc(this.t('resultInteraction'))}</span><span class="rvl">${this.esc(this.t(modeKey))}</span></div>`;
    $('rrep').dataset.lang = this.language;
    if (!rerender) {
      Sounds.play(r.passed ? 'correct' : 'hint');
      this.speak(this.t('voiceTestComplete', { percent: r.percent, message: this.t(msg) }));
      EVENTS.emit(EVENT_NAMES.QUIZ_COMPLETE, r);
    }
  }

  _bindResult() {
    document.querySelectorAll('#sr [data-ra]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.ra;
      if (a === 'retry') this.retry();
      else if (a === 'home') this.home();
      else if (a === 'study') this.showLesson();
    }));
  }

  showLesson() {
    const subjectId = this.state.get('quiz.subject');
    if (!subjectId) { this.showScreen('subjects'); return; }
    this.lesson = { list: DB.lessons[subjectId] || [], index: 0 };
    if (!this.lesson.list.length) { this.retry(); return; }
    this.showScreen('lesson');
    this._renderLesson({ speak: true });
  }

  _renderLesson({ speak = false } = {}) {
    const { list, index } = this.lesson;
    if (!list.length) return;
    const lesson = DB.localizeLesson(list[index], this.language);
    const $ = id => document.getElementById(id);
    $('lc').textContent = this.t('lessonPage', { current: index + 1, total: list.length });
    const pct = Math.round(((index + 1) / list.length) * 100);
    $('lpf').style.width = `${pct}%`;
    $('lprog').setAttribute('aria-valuenow', String(pct));
    // Lesson bodies come from our own DB (trusted HTML with <span class="lhl"> highlights).
    $('lbox').innerHTML = `<h1 class="ltit" id="ltit" tabindex="-1">${this.esc(lesson.title)}</h1><div class="lp">${lesson.body}</div>`;
    const prev = index > 0 ? `<button type="button" class="lbtn" data-a="prev">${this.esc(this.t('lessonPrev'))}</button>` : '';
    const next = index < list.length - 1
      ? `<button type="button" class="lbtn pri" data-a="next">${this.esc(this.t('lessonNext'))}</button>`
      : `<button type="button" class="lbtn pri" data-a="quiz">${this.icon('edit')}<span>${this.esc(this.t('lessonQuizButton'))}</span></button>`;
    $('lnav').innerHTML = `${prev}<div class="lsep"></div>${next}`;
    $('lbox').dataset.lang = this.language;
    $('lnav').querySelectorAll('.lbtn').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'next' || a === 'prev') {
        this.lesson.index += a === 'next' ? 1 : -1;
        this._renderLesson({ speak: true });
        DwellController.disarm();
        $('ltit').focus({ preventScroll: true });
      } else {
        this._prepareQuiz();
        this.showQuestion();
      }
    }));
    if (speak) this.speak(`${lesson.title}. ${lesson.body}`);
  }

  home() {
    VoiceManager.stop();
    this.hesitation.stop();
    this._hideHint();
    this.showScreen('welcome');
  }

  retry() {
    if (!this.state.get('quiz.subject')) { this.showScreen('subjects'); return; }
    this._prepareQuiz();
    this.showQuestion();
  }

  // Kept for backward compatibility with inline handlers / older code.
  adjustDwell(delta) { Settings.step('dwellMs', delta > 0 ? 1 : -1); }
}

const App = new EnsafApp();
window.App = App;

(async function initializeApp() {
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  if (window.SCREENS_READY) await window.SCREENS_READY;
  App.init();
})();
