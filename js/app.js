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
    this.language = localStorage.getItem('ensaf-lang') || 'ar';
    this.auth = null;
    this.translations = {
      ar: {
        statusLoading: 'جاري التهيئة…',
        statusActive: 'التتبع نشط',
        statusWeak: 'إشارة ضعيفة',
        statusNoFace: 'لا يوجد وجه',
        accuracyLabel: 'الدقة',
        recalibrate: 'إعادة المعايرة',
        home: 'الرئيسية',
        themeLight: 'الوضع الافتراضي',
        themeDark: 'الوضع الليلي',
        hintTitle: 'تلميح',
        fallbackMessage: 'وضع الماوس — حرّك المؤشر للتفاعل',
        welcomeTag: 'منصة التعلم بتتبع حركة الرأس والعين',
        welcomeFeatureHead: 'تتبع الرأس',
        welcomeFeatureEye: 'تتبع العين',
        welcomeFeatureSmart: 'تلميحات ذكية',
        welcomeFeatureReports: 'تقارير الجلسة',
        welcomeFeatureVoice: 'قراءة صوتية',
        welcomeFeatureNoCalib: 'بدون معايرة',
        landingHowItWorks: 'إنصاف يستخدم الكاميرا فقط لتوجيه المؤشر من خلال حركة الرأس أو العين مع دعم الماوس كبديل. يساعدك هذا النظام على التعلم بتركيز أكبر، وحفظ التقدم الشخصي، واختيار تجربة تعليمية تتناسب مع مهاراتك.',
        landingBenefitsAdaptive: 'تعلم شخصي مبني على السلوك',
        landingBenefitsEngaging: 'تجربة تفاعلية مع تتبع العين والرأس',
        landingBenefitsSecure: 'خصوصية كاملة وعرض محلي للبيانات',
        landingBenefitsPreferences: 'ملف شخصي وتفضيلات مخصصة',
        landingWelcomeGuest: 'سجل الدخول لتحفظ بياناتك، أو استمر كزائر لتجربة التطبيق.',
        authTabLogin: 'تسجيل الدخول',
        authTabRegister: 'إنشاء حساب',
        authEmail: 'البريد الإلكتروني',
        authPassword: 'كلمة المرور',
        authName: 'الاسم',
        authConfirmPassword: 'تأكيد كلمة المرور',
        authSubmitLogin: 'دخول',
        authSubmitRegister: 'إنشاء حساب',
        authForgotPassword: 'نسيت كلمة المرور؟',
        authGuestContinue: 'المتابعة كزائر',
        authProfileButton: 'الملف',
        authProfileTitle: 'الملف الشخصي',
        authProfileWelcome: 'مرحباً، {name}',
        authProfileEmail: 'البريد الإلكتروني',
        authProfileModeLabel: 'طريقة التفاعل',
        authProfileThemeLabel: 'الثيم',
        authProfileLangLabel: 'اللغة',
        authLoginDescription: 'يسجل الدخول للحفاظ على تقدمك وخياراتك الشخصية.',
        authProfileSave: 'حفظ التفضيلات',
        authProfileSignOut: 'تسجيل الخروج',
        authSignedIn: 'تم تسجيل الدخول بنجاح.',
        authCreatedAccount: 'تم إنشاء الحساب بنجاح.',
        authPasswordMismatch: 'كلمة المرور والتأكيد غير متطابقتين.',
        authResetSentMessage: 'تم إرسال تعليمات إعادة التعيين إلى بريدك الإلكتروني.',
        authPreferencesSaved: 'تم حفظ إعداداتك.',
        authGuestEmail: 'زائر',
        landingLoginCTA: 'تسجيل الدخول / إنشاء حساب',
        welcomeLoginCTA: 'تسجيل الدخول / إنشاء حساب',
        modeEyeOption: 'تتبع العين (أدق)',
        modeMouseOption: 'الماوس (بديل)',
        startLearning: 'ابدأ التعلم ←',
        welcomeNote: 'يتطلب كاميرا ويب وإضاءة جيدة. جميع البيانات تُعالج محلياً على جهازك.',
        permissionTitle: 'إذن الكاميرا مطلوب',
        permissionDesc: 'يستخدم التتبع الكاميرا لرصد حركة رأسك أو عينيك. لا يتم تخزين أي مقاطع فيديو.',
        permissionStep1: 'انقر "السماح" في نافذة إذن المتصفح',
        permissionStep2: 'إضاءة جيدة — يجب أن يكون وجهك مرئياً بوضوح',
        permissionStep3: 'اجلس على بُعد 50–70 سم من الشاشة',
        permissionStep4: 'حرّك رأسك أو عينيك لتوجيه المؤشر',
        permissionAllow: 'السماح بالكاميرا',
        permissionUseMouse: 'استخدام الماوس بدلاً من ذلك',
        subjectSelect: 'اختر مادة دراسية',
        subjectHint: 'وجّه المؤشر نحو البطاقة وثبّته للاختيار',
        questionCounter: 'السؤال {current} من {total}',
        resultCorrect: 'أجبت على {score} من {total} بشكل صحيح',
        resultTime: 'متوسط وقت السؤال',
        resultHints: 'تلميحات',
        resultSubject: 'المادة',
        resultInteraction: 'طريقة التفاعل',
        resultRetry: 'إعادة المحاولة',
        resultStudy: 'محتوى تعليمي',
        lessonPrev: '← السابق',
        lessonNext: 'التالي →',
        lessonQuiz: 'اختبار',
        voiceReady: 'نظام التتبع جاهز. اختر مادة دراسية.',
        voiceRecalibrating: 'جاري إعادة ضبط التتبع. انظر مباشرة إلى الشاشة.',
        voiceSOSActive: 'تم تفعيل وضع الطوارئ.',
        cameraFailed: 'تعذر تشغيل الكاميرا. جاري التبديل إلى وضع الماوس.',
        hintVoice: 'تلميح: {hint}',
        gradeExcellent: 'ممتاز!',
        gradeGood: 'جيد!',
        gradeTryAgain: 'استمر في المحاولة!',
        gradeMessageExcellent: 'عمل رائع! استمر بهذا المستوى.',
        gradeMessageGood: 'نتيجة جيدة. استمر في التدريب.',
        gradeMessageRetry: 'راجع المادة وحاول مجدداً.',
        voiceChooseSubject: 'اخترت {subject}. سيبدأ الاختبار الآن.',
        voiceCorrectAnswer: 'إجابة صحيحة!',
        voiceWrongAnswerPrefix: 'الإجابة الصحيحة هي: {answer}',
        resultStatsCorrect: 'صحيح',
        resultStatsDuration: 'المدة',
        resultStatsHints: 'تلميحات',
        timeSeconds: 'ث',
        resultScoreLabel: 'النتيجة',
        lessonPage: 'الدرس {current} من {total}',
        lessonQuizButton: 'اختبار',
        voiceTestComplete: 'انتهى الاختبار. حصلت على {percent} بالمئة. {message}'
      },
      en: {
        statusLoading: 'Loading…',
        statusActive: 'Tracking active',
        statusWeak: 'Weak signal',
        statusNoFace: 'No face detected',
        accuracyLabel: 'Accuracy',
        recalibrate: 'Recalibrate',
        home: 'Home',
        themeLight: 'Light mode',
        themeDark: 'Dark mode',
        hintTitle: 'Hint',
        fallbackMessage: 'Mouse mode — move the cursor to interact',
        welcomeTag: 'Adaptive learning with head and eye tracking',
        welcomeFeatureHead: 'Head tracking',
        welcomeFeatureEye: 'Eye tracking',
        welcomeFeatureSmart: 'Smart hints',
        welcomeFeatureReports: 'Session reports',
        welcomeFeatureVoice: 'Voice feedback',
        welcomeFeatureNoCalib: 'No calibration',
        landingHowItWorks: 'Ensaf uses your webcam only to guide the cursor with head or eye movement, while mouse input remains available. It helps you focus better, save progress, and choose the learning style that fits you.',
        landingBenefitsAdaptive: 'Adaptive learning based on behavior',
        landingBenefitsEngaging: 'Interactive experience with head and eye tracking',
        landingBenefitsSecure: 'Full privacy and local data handling',
        landingBenefitsPreferences: 'Personal profile and preferences',
        landingWelcomeGuest: 'Log in to save your progress, or continue as a guest to try the app.',
        authTabLogin: 'Login',
        authTabRegister: 'Sign Up',
        authEmail: 'Email',
        authPassword: 'Password',
        authName: 'Name',
        authConfirmPassword: 'Confirm Password',
        authSubmitLogin: 'Sign In',
        authSubmitRegister: 'Create Account',
        authForgotPassword: 'Forgot password?',
        authGuestContinue: 'Continue as guest',
        authProfileButton: 'Profile',
        authProfileTitle: 'Profile',
        authProfileWelcome: 'Welcome, {name}',
        authProfileEmail: 'Email',
        authProfileModeLabel: 'Interaction mode',
        authProfileThemeLabel: 'Theme',
        authProfileLangLabel: 'Language',
        authLoginDescription: 'Sign in to preserve your progress and personalized settings.',
        authProfileSave: 'Save preferences',
        authProfileSignOut: 'Sign out',
        authSignedIn: 'Signed in successfully.',
        authCreatedAccount: 'Account created successfully.',
        authPasswordMismatch: 'Password and confirmation do not match.',
        authResetSentMessage: 'Reset instructions have been sent to your email.',
        authPreferencesSaved: 'Your settings were saved.',
        authGuestEmail: 'Guest',
        landingLoginCTA: 'Login / Sign Up',
        welcomeLoginCTA: 'Login / Sign Up',
        modeEyeOption: 'Eye tracking (more accurate)',
        modeMouseOption: 'Mouse (fallback)',
        startLearning: 'Start learning ←',
        welcomeNote: 'Requires a webcam and good lighting. All data is processed locally on your device.',
            permissionTitle: 'Camera permission required',
        permissionDesc: 'Tracking uses the camera to follow your head or eye movement. No video is stored.',
        permissionStep1: 'Click "Allow" in the browser permission window',
        permissionStep2: 'Good lighting — your face should be clearly visible',
        permissionStep3: 'Sit 50–70 cm from the screen',
        permissionStep4: 'Move your head or eyes to steer the cursor',
        permissionAllow: 'Allow camera',
        permissionUseMouse: 'Use mouse instead',
        subjectSelect: 'Choose a subject',
        subjectHint: 'Point at a card and hold to select',
        questionCounter: 'Question {current} of {total}',
        resultCorrect: 'You answered {score} of {total} correctly',
        resultTime: 'Average time per question',
        resultHints: 'Hints',
        resultSubject: 'Subject',
        resultInteraction: 'Interaction method',
        resultRetry: 'Retry',
        resultStudy: 'Study content',
        lessonPrev: '← Previous',
        lessonNext: 'Next →',
        lessonQuiz: 'Quiz',
        voiceReady: 'Tracker ready. Choose a subject.',
        voiceRecalibrating: 'Recalibrating the tracker. Look at the screen.',
        voiceSOSActive: 'Emergency mode activated.',
        cameraFailed: 'Camera failed. Switching to mouse mode.',
        hintVoice: 'Hint: {hint}',
        gradeExcellent: 'Excellent!',
        gradeGood: 'Good!',
        gradeTryAgain: 'Keep trying!',
        gradeMessageExcellent: 'Great work! Keep it up.',
        gradeMessageGood: 'Good result. Keep practicing.',
        gradeMessageRetry: 'Review the material and try again.',
        voiceChooseSubject: 'You chose {subject}. The quiz will start now.',
        voiceCorrectAnswer: 'Correct answer!',
        voiceWrongAnswerPrefix: 'The correct answer is: {answer}',
        resultStatsCorrect: 'Correct',
        resultStatsDuration: 'Duration',
        resultStatsHints: 'Hints',
        timeSeconds: 's',
        resultScoreLabel: 'Score',
        lessonPage: 'Lesson {current} of {total}',
        lessonQuizButton: 'Quiz',
        voiceTestComplete: 'The quiz is over. You scored {percent} percent. {message}'
      },
      zh: {
        statusLoading: '加载中…',
        statusActive: '跟踪已启用',
        statusWeak: '信号弱',
        statusNoFace: '未检测到人脸',
        accuracyLabel: '精度',
        recalibrate: '重新校准',
        home: '首页',
        themeLight: '亮色模式',
        themeDark: '深色模式',
        hintTitle: '提示',
        fallbackMessage: '鼠标模式——移动光标进行交互',
        welcomeTag: '头部和眼动追踪的自适应学习',
        welcomeFeatureHead: '头部追踪',
        welcomeFeatureEye: '眼动追踪',
        welcomeFeatureSmart: '智能提示',
        welcomeFeatureReports: '会话报告',
        welcomeFeatureVoice: '语音反馈',
        welcomeFeatureNoCalib: '无需校准',
        landingHowItWorks: 'Ensaf 仅使用摄像头通过头部或眼睛运动引导光标，并同时保留鼠标输入。它帮助您更专注地学习，保存进度，并选择适合自己的学习方式。',
        landingBenefitsAdaptive: '基于行为的自适应学习',
        landingBenefitsEngaging: '头部与眼动追踪的互动体验',
        landingBenefitsSecure: '完全隐私，本地数据处理',
        landingBenefitsPreferences: '个人档案与偏好设置',
        landingWelcomeGuest: '登录以保存进度，或作为访客继续体验应用。',
        authTabLogin: '登录',
        authTabRegister: '创建账号',
        authEmail: '邮箱',
        authPassword: '密码',
        authName: '姓名',
        authConfirmPassword: '确认密码',
        authSubmitLogin: '登录',
        authSubmitRegister: '创建账号',
        authForgotPassword: '忘记密码？',
        authGuestContinue: '以访客身份继续',
        authProfileButton: '个人资料',
        authProfileTitle: '个人资料',
        authProfileWelcome: '欢迎，{name}',
        authProfileEmail: '邮箱',
        authProfileModeLabel: '交互模式',
        authProfileThemeLabel: '主题',
        authProfileLangLabel: '语言',
        authLoginDescription: '登录以保存您的进度和个性化设置。',
        authProfileSave: '保存偏好',
        authProfileSignOut: '注销',
        authSignedIn: '登录成功。',
        authCreatedAccount: '账号创建成功。',
        authPasswordMismatch: '密码与确认密码不一致。',
        authResetSentMessage: '重置说明已发送到您的邮箱。',
        authPreferencesSaved: '已保存您的设置。',
        authGuestEmail: '访客',
        landingLoginCTA: '登录 / 创建账号',
        welcomeLoginCTA: '登录 / 创建账号',
        modeEyeOption: '眼动追踪（更准确）',
        modeMouseOption: '鼠标（备用）',
        startLearning: '开始学习 ←',
        welcomeNote: '需要摄像头和良好照明。所有数据均在您的设备上本地处理。',
        permissionTitle: '需要摄像头权限',
        permissionDesc: '跟踪使用摄像头跟踪您的头部或眼睛移动。不会存储视频。',
        permissionStep1: '在浏览器权限窗口中点击“允许”',
        permissionStep2: '良好照明——您的面部应清晰可见',
        permissionStep3: '与屏幕保持50-70厘米距离',
        permissionStep4: '移动头部或眼睛来控制光标',
        permissionAllow: '允许摄像头',
        permissionUseMouse: '使用鼠标作为替代',
        subjectSelect: '选择学习科目',
        subjectHint: '对准卡片并停留以选择',
        questionCounter: '第{current}题，共{total}题',
        resultCorrect: '正确回答了{score} / {total}',
        resultTime: '每题平均时间',
        resultHints: '提示',
        resultSubject: '科目',
        resultInteraction: '交互方式',
        resultRetry: '再次尝试',
        resultStudy: '学习内容',
        lessonPrev: '← 上一页',
        lessonNext: '下一页 →',
        lessonQuiz: '测验',
        voiceReady: '跟踪系统已就绪。请选择一个科目。',
        voiceRecalibrating: '正在重新校准跟踪系统。请直视屏幕。',
        voiceSOSActive: '已激活紧急模式。',
        cameraFailed: '摄像头无法启动。正在切换到鼠标模式。',
        hintVoice: '提示：{hint}',
        gradeExcellent: '优秀！',
        gradeGood: '良好！',
        gradeTryAgain: '继续努力！',
        gradeMessageExcellent: '表现很好！请继续保持。',
        gradeMessageGood: '结果不错。继续练习。',
        gradeMessageRetry: '请复习内容并重试。',
        voiceChooseSubject: '您已选择 {subject}。测验现在开始。',
        voiceCorrectAnswer: '回答正确！',
        voiceWrongAnswerPrefix: '正确答案是：{answer}',
        resultStatsCorrect: '正确',
        resultStatsDuration: '时长',
        resultStatsHints: '提示',
        timeSeconds: '秒',
        resultScoreLabel: '得分',
        lessonPage: '第{current}课，共{total}课',
        lessonQuizButton: '测验',
        voiceTestComplete: '测验结束。您的得分是 {percent}%。{message}'
      }
    };
  }

  getIcon(name, size = 'sm') {
    return `<span class="material-symbols-outlined icon icon-${size}">${name}</span>`;
  }

  iconLabel(name, label) {
    return `${this.getIcon(name)}${label}`;
  }

  t(key, vars = {}) {
    const message = (this.translations[this.language] && this.translations[this.language][key]) || this.translations.ar[key] || key;
    return Object.keys(vars).reduce((text, k) => text.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]), message);
  }

  getSubjectLabel(subject) {
    if (!subject) return this.t('resultSubject');
    if (!subject.name) return '';
    return typeof subject.name === 'object' ? subject.name[this.language] || subject.name.ar : subject.name;
  }

  setLanguage(lang) {
    if (!this.translations[lang]) lang = 'ar';
    this.language = lang;
    localStorage.setItem('ensaf-lang', lang);
    if (this.state && typeof this.state.set === 'function') {
      this.state.set('lang', lang);
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (typeof VoiceManager !== 'undefined' && typeof VoiceManager.setLang === 'function') {
      const voiceLangs = { ar: 'ar-SA', en: 'en-US', zh: 'zh-CN' };
      VoiceManager.setLang(voiceLangs[lang] || 'ar-SA');
    }
    this.translateUI();
  }

  translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });

    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) langSwitch.value = this.language;

    const recalBtn = document.getElementById('recal-btn');
    if (recalBtn) recalBtn.innerHTML = this.iconLabel('track_changes', this.t('recalibrate'));

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.innerHTML = this.iconLabel('home', this.t('home'));

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      const theme = document.body.classList.contains('theme-warm') ? 'dark' : 'light';
      themeBtn.title = this.t(theme === 'dark' ? 'themeDark' : 'themeLight');
    }

    const fb = document.getElementById('fb');
    if (fb) fb.innerHTML = `${this.getIcon('bolt')} ${this.t('fallbackMessage')}`;

    const indicator = document.getElementById('mode-indicator');
    const currentMode = this.state.get('mode');
    if (indicator) {
      switch (currentMode) {
        case 'head': indicator.innerHTML = this.iconLabel('track_changes', this.t('modeHeadOption')); break;
        case 'eye': indicator.innerHTML = this.iconLabel('visibility', this.t('modeEyeOption')); break;
        case 'mouse': indicator.innerHTML = this.iconLabel('mouse', this.t('modeMouseOption')); break;
      }
    }

    document.querySelectorAll('.mbtn span[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });

    if (document.getElementById('qc')) {
      const index = this.state.get('quiz.index');
      const total = (this.state.get('quiz.questions') || []).length;
      document.getElementById('qc').textContent = this.t('questionCounter', { current: index + 1, total });
    }
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
    const langSwitch = document.getElementById('lang-switch');
    
    if (dmBtn) dmBtn.onclick = () => this.adjustDwell(-500);
    if (dpBtn) dpBtn.onclick = () => this.adjustDwell(+500);
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();
    if (langSwitch) langSwitch.onchange = () => this.setLanguage(langSwitch.value);
    
    // Mode buttons
    document.querySelectorAll('.mbtn').forEach(btn => {
      btn.onclick = () => this.setMode(btn.dataset.mode, btn);
    });

    this.initTheme();
    this.setLanguage(this.language);
    this.translateUI();
    this.auth = new AuthManager();
    this.auth.init();
    if (this.auth.isSignedIn()) {
      const prefs = this.auth.getUser()?.preferences || {};
      if (prefs.language) this.language = prefs.language;
      if (prefs.theme) this.applyTheme(prefs.theme);
      if (prefs.mode) this.setMode(prefs.mode, document.querySelector(`[data-mode="${prefs.mode}"]`));
      this.setLanguage(this.language);
      this.translateUI();
    }
    this.renderUserState();
    this.setupAuthForms();
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
          indicator.innerHTML = this.iconLabel('track_changes', this.t('modeHeadOption'));
          break;
        case 'eye':
          indicator.classList.add('mode-eye');
          indicator.innerHTML = this.iconLabel('visibility', this.t('modeEyeOption'));
          break;
        case 'mouse':
          indicator.classList.add('mode-mouse');
          indicator.innerHTML = this.iconLabel('mouse', this.t('modeMouseOption'));
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
    if (!this.auth || !this.auth.isSignedIn()) {
      this.showScreen('login');
      return;
    }
    this.startFromUser();
  }

  startFromUser() {
    const mode = this.state.get('mode');
    if (mode === 'mouse') {
      this._setupMouseMode();
      this.showScreen('s');
      this.buildSubjectsGrid();
    } else {
      this.showScreen('p');
    }
  }

  showLogin() {
    this.showScreen('login');
    this.renderUserState();
    this._clearAuthStatus();
  }

  showProfile() {
    if (!this.auth || !this.auth.isSignedIn()) {
      this.showLogin();
      return;
    }
    this.showScreen('profile');
    this._populateProfileFields();
  }

  renderUserState() {
    const profileBtn = document.getElementById('profile-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeUser = document.getElementById('welcome-user');
    const authStatus = document.getElementById('auth-status');
    const user = this.auth ? this.auth.getUser() : null;

    if (profileBtn) {
      profileBtn.style.display = user && !user.isGuest ? 'inline-flex' : 'none';
    }
    if (logoutBtn) {
      logoutBtn.style.display = user && !user.isGuest ? 'inline-flex' : 'none';
    }

    if (welcomeUser) {
      welcomeUser.textContent = user ? this.t('authProfileWelcome', { name: user.name || user.email || 'User' }) : this.t('landingWelcomeGuest');
    }

    if (authStatus) {
      authStatus.textContent = '';
      authStatus.className = 'auth-status';
    }
  }

  setupAuthForms() {
    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const forgotBtn = document.getElementById('auth-forgot-btn');
    const guestBtn = document.getElementById('auth-guest-btn');
    const topLogoutBtn = document.getElementById('logout-btn');
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const signOutBtn = document.getElementById('profile-signout-btn');

    if (loginTab) loginTab.onclick = () => this._switchAuthTab('login');
    if (registerTab) registerTab.onclick = () => this._switchAuthTab('register');
    if (loginForm) loginForm.onsubmit = async (event) => { event.preventDefault(); await this.handleLogin(); };
    if (registerForm) registerForm.onsubmit = async (event) => { event.preventDefault(); await this.handleRegister(); };
    if (forgotBtn) forgotBtn.onclick = () => this.handlePasswordReset();
    if (guestBtn) {
      if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.requireAuth) {
        guestBtn.style.display = 'none';
      } else {
        guestBtn.onclick = () => {
          if (!this.auth) this.auth = new AuthManager();
          this.auth.continueAsGuest();
          this.renderUserState();
          this.startFromUser();
        };
      }
    }
    if (profileSaveBtn) profileSaveBtn.onclick = async () => { await this._saveProfilePreferences(); };
    if (signOutBtn) signOutBtn.onclick = () => {
      if (this.auth) this.auth.signOut();
      this.renderUserState();
      this.showLogin();
    };
    if (topLogoutBtn) topLogoutBtn.onclick = () => {
      if (this.auth) this.auth.signOut();
      this.renderUserState();
      this.showLogin();
    };
  }

  _switchAuthTab(tab) {
    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');

    if (tab === 'login') {
      loginTab?.classList.add('act');
      registerTab?.classList.remove('act');
      loginForm?.classList.remove('hidden');
      registerForm?.classList.add('hidden');
    } else {
      loginTab?.classList.remove('act');
      registerTab?.classList.add('act');
      loginForm?.classList.add('hidden');
      registerForm?.classList.remove('hidden');
    }
    this._clearAuthStatus();
  }

  _setAuthStatus(message, type = 'info') {
    const authStatus = document.getElementById('auth-status');
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.className = `auth-status ${type}`;
  }

  _clearAuthStatus() {
    const authStatus = document.getElementById('auth-status');
    if (!authStatus) return;
    authStatus.textContent = '';
    authStatus.className = 'auth-status';
  }

  async handleLogin() {
    if (!this.auth) this.auth = new AuthManager();
    const email = document.getElementById('login-email')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    try {
      this._setAuthStatus(this.t('statusLoading'), 'info');
      const result = await this.auth.signIn(email, password);
      if (!result || !result.success) {
        this._setAuthStatus(result?.message || 'Sign in failed', 'error');
        return;
      }
      this._setAuthStatus(this.t('authSignedIn'), 'success');
      this.renderUserState();
      // auto-redirect after successful sign-in
      this.startFromUser();
    } catch (e) {
      this._setAuthStatus(e.message || String(e), 'error');
    }
  }

  async handleRegister() {
    if (!this.auth) this.auth = new AuthManager();
    const name = document.getElementById('register-name')?.value || '';
    const email = document.getElementById('register-email')?.value || '';
    const password = document.getElementById('register-password')?.value || '';
    const confirm = document.getElementById('register-confirm')?.value || '';
    if (password !== confirm) {
      this._setAuthStatus(this.t('authPasswordMismatch'), 'error');
      return;
    }
    try {
      this._setAuthStatus(this.t('statusLoading'), 'info');
      const result = await this.auth.signUp(name, email, password);
      if (!result || !result.success) {
        this._setAuthStatus(result?.message || 'Sign up failed', 'error');
        return;
      }
      // show sync status if available
      if (result.synced === false) {
        this._setAuthStatus('Account created but profile sync failed.', 'warning');
      } else {
        this._setAuthStatus(this.t('authCreatedAccount'), 'success');
      }
      this.renderUserState();
      this.startFromUser();
    } catch (e) {
      this._setAuthStatus(e.message || String(e), 'error');
    }
  }

  async handlePasswordReset() {
    if (!this.auth) this.auth = new AuthManager();
    const email = document.getElementById('login-email')?.value || '';
    try {
      this._setAuthStatus(this.t('statusLoading'), 'info');
      const result = await this.auth.sendPasswordReset(email);
      if (!result || !result.success) {
        this._setAuthStatus(result?.message || 'Reset failed', 'error');
        return;
      }
      this._setAuthStatus(this.t('authResetSentMessage'), 'success');
    } catch (e) {
      this._setAuthStatus(e.message || String(e), 'error');
    }
  }

  _populateProfileFields() {
    const user = this.auth ? this.auth.getUser() : null;
    if (!user) return;
    const name = user.name || '';
    const email = user.email || '';
    const preferences = user.preferences || {};
    const welcome = document.getElementById('profile-welcome');
    const emailEl = document.getElementById('profile-email');
    const modeSelect = document.getElementById('profile-mode');
    const themeSelect = document.getElementById('profile-theme');
    const languageSelect = document.getElementById('profile-language');

    if (welcome) welcome.textContent = this.t('authProfileWelcome', { name });
    if (emailEl) emailEl.textContent = email || this.t('authGuestEmail');
    if (modeSelect) modeSelect.value = preferences.mode || this.state.get('mode');
    if (themeSelect) themeSelect.value = preferences.theme || (document.body.classList.contains('theme-warm') ? 'warm' : 'default');
    if (languageSelect) languageSelect.value = preferences.language || this.language;
  }

  async _saveProfilePreferences() {
    const mode = document.getElementById('profile-mode')?.value || this.state.get('mode');
    const theme = document.getElementById('profile-theme')?.value || (document.body.classList.contains('theme-warm') ? 'warm' : 'default');
    const language = document.getElementById('profile-language')?.value || this.language;

    if (this.auth) {
      this._setAuthStatus(this.t('statusLoading'), 'info');
      const res = await this.auth.savePreferences({ mode, theme, language });
      if (res && res.success === false) {
        this._setAuthStatus(res.message || 'Failed to save preferences', 'error');
      } else {
        this._setAuthStatus(this.t('authPreferencesSaved'), 'success');
      }
    }

    this.setMode(mode, document.querySelector(`.mbtn[data-mode="${mode}"]`));
    this.applyTheme(theme);
    this.setLanguage(language);
    this.renderUserState();
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
          VoiceManager.speak(this.t('voiceReady'));
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
    alert(this.t('cameraFailed'));
    this.useMouse();
  }

  _showUI() {
    const bar = document.getElementById('bar');
    const vi = document.getElementById('vi');
    
    if (bar) bar.classList.add('show');
    if (vi) vi.style.display = 'flex';
  }

  showScreen(screenId) {
    // Map every legacy 1-letter code AND old DOM ids to canonical router names
    const legacyMap = {
      // 1-letter codes used throughout app.js
      'w':  'welcome',
      'p':  'permission',
      's':  'subjects',
      'q':  'question',
      'l':  'lesson',
      'r':  'result',
      // short DOM ids (in case called directly)
      'sw': 'welcome',
      'sp': 'permission',
      'ss': 'subjects',
      'sq': 'question',
      'sl': 'lesson',
      'sr': 'result',
    };

    const canonical = legacyMap[screenId] || screenId;  // 'login', 'profile' pass through unchanged
    this.state.set('screen', canonical);
    ROUTER.navigate(canonical);
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
        <div class="snm">${this.getSubjectLabel(s)}</div>
        <div class="sct">${DB.getQuestionCount(s.id)} Q</div>
      </div>
    `).join('');
    
    // Setup dwell
    if (this.dwell && this.dwell.destroy) this.dwell.destroy();
    
    const cards = Array.from(grid.querySelectorAll('.scard'));
    cards.forEach(card => {
      card.onclick = () => this.selectSubject(card.dataset.id);
    });
    const isMouseMode = this.state.get('mode') === 'mouse';
    if (!isMouseMode) {
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
    } else {
      this.dwell = null;
    }
  }

  selectSubject(subjectId) {
    this.state.set('quiz.subject', subjectId);
    this.dwell = null;
    
    if (typeof DB === 'undefined') return;
    
    const questions = DB.getQuestions(subjectId, CONFIG.QUIZ.QUESTIONS_PER_ROUND, this.language);
    
    this.state.set('quiz.questions', questions);
    this.state.set('quiz.index', 0);
    this.state.set('quiz.score', 0);
    this.state.set('quiz.hesitations', 0);
    this.state.set('quiz.startTime', Date.now());
    
    const subject = DB.getSubject(subjectId);
    const selectedSubjectLabel = this.getSubjectLabel(subject);
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(this.t('voiceChooseSubject', { subject: selectedSubjectLabel }));
    }
    
    const hasLessons = DB.getLessons(subjectId, this.language).length > 0;
    setTimeout(() => hasLessons ? this.showLesson() : this.showQuestion(), 500);
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
    const selectedSubjectLabel = this.getSubjectLabel(subject);
    const total = questions.length;
    
    const qc = document.getElementById('qc');
    const qpf = document.getElementById('qpf');
    const qpts = document.getElementById('qpts');
    const qtag = document.getElementById('qtag');
    const qtxt = document.getElementById('qtxt');
    
    if (qc) qc.textContent = this.t('questionCounter', { current: index + 1, total });
    if (qpf) qpf.style.width = `${(index / total) * 100}%`;
    if (qpts) qpts.innerHTML = `${this.getIcon('star')} ${this.state.get('quiz.score')}`;
    if (qtag) qtag.innerHTML = `${this.getIcon(subject ? subject.icon : 'menu_book')} ${selectedSubjectLabel}`;
    if (qtxt) qtxt.textContent = typeof q.q === 'object' ? (q.q[this.language] || q.q.ar || '') : q.q;
    
    const answersGrid = document.getElementById('agrid');
    if (!answersGrid) return;
    
    const letters = this.language === 'ar' ? ['أ', 'ب', 'ج', 'د'] : ['A', 'B', 'C', 'D'];
    answersGrid.innerHTML = q.opts.map((opt, i) => {
      const answerText = typeof opt === 'object' ? (opt[this.language] || opt.ar || '') : opt;
      return `
        <div class="abtn" data-i="${i}">
          <div class="altr">${letters[i]}</div>
          <div class="atxt">${answerText}</div>
          <div class="adw"><div class="adwf" id="df${i}"></div></div>
        </div>
      `;
    }).join('');
    
    if (typeof VoiceManager !== 'undefined') {
      const questionText = typeof q.q === 'object' ? (q.q[this.language] || q.q.ar || '') : q.q;
      VoiceManager.speak(questionText);
    }
    
    // Setup dwell for answers
    if (this.dwell && this.dwell.destroy) this.dwell.destroy();
    
    const buttons = Array.from(answersGrid.querySelectorAll('.abtn'));
    buttons.forEach(btn => {
      btn.onclick = () => this.selectAnswer(parseInt(btn.dataset.i));
    });
    const isMouseMode = this.state.get('mode') === 'mouse';
    if (!isMouseMode) {
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
    } else {
      this.dwell = null;
    }
    
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
      if (typeof VoiceManager !== 'undefined') VoiceManager.speak(this.t('voiceCorrectAnswer'));
    } else {
      if (typeof VoiceManager !== 'undefined') {
        const answerValue = q.opts[q.ans];
        const answerText = typeof answerValue === 'object' ? (answerValue[this.language] || answerValue.ar || '') : answerValue;
        VoiceManager.speak(this.t('voiceWrongAnswerPrefix', { answer: answerText }));
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
    if (typeof VoiceManager !== 'undefined') VoiceManager.speak(this.t('hintVoice', { hint }));
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
    const selectedSubjectLabel = this.getSubjectLabel(subject);
    const hesitations = this.state.get('quiz.hesitations');
    
    // Determine grade
    let icon, label, message;
    if (percent >= 90) {
      icon = 'emoji_events'; label = this.t('gradeExcellent'); message = this.t('gradeMessageExcellent');
    } else if (percent >= 70) {
      icon = 'star'; label = this.t('gradeGood'); message = this.t('gradeMessageGood');
    } else if (percent >= 50) {
      icon = 'thumb_up'; label = this.t('gradeGood'); message = this.t('gradeMessageGood');
    } else {
      icon = 'fitness_center'; label = this.t('gradeTryAgain'); message = this.t('gradeMessageRetry');
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
    if (ru) ru.textContent = this.t('resultCorrect', { score, total });
    
    if (rst) {
      rst.innerHTML = `
        <div class="rstat"><div class="rsv">${score}/${total}</div><div class="rsl">${this.t('resultStatsCorrect')}</div></div>
        <div class="rstat"><div class="rsv">${duration}${this.t('timeSeconds')}</div><div class="rsl">${this.t('resultStatsDuration')}</div></div>
        <div class="rstat"><div class="rsv">${hesitations}</div><div class="rsl">${this.t('resultStatsHints')}</div></div>
      `;
    }
    
    if (rrep) {
      const modeLabel = this._getModeLabel();
      rrep.innerHTML = `
        <div class="rrow"><span class="rlb">${this.t('resultSubject')}</span><span class="rvl">${this.getIcon(subject ? subject.icon : 'menu_book')} ${selectedSubjectLabel}</span></div>
        <div class="rrow"><span class="rlb">${this.t('resultScoreLabel')}</span><span class="rvl ${percent >= 70 ? 'g' : 'w'}">${percent}%</span></div>
        <div class="rrow"><span class="rlb">${this.t('resultStatsDuration')}</span><span class="rvl">${Math.round(duration / total)}${this.t('timeSeconds')}</span></div>
        <div class="rrow"><span class="rlb">${this.t('resultInteraction')}</span><span class="rvl">${modeLabel}</span></div>
      `;
    }
    
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(this.t('voiceTestComplete', { percent, message }));
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
      const isMouseMode = this.state.get('mode') === 'mouse';
      const handleResultAction = (id) => {
        this.dwell = null;
        if (id === 'retry') this.retry();
        else if (id === 'home') this.home();
        else if (id === 'study') this.showLesson();
      };
      targets.forEach(btn => {
        btn.onclick = () => handleResultAction(btn.dataset.ra);
      });
      
      if (!isMouseMode) {
        this.dwell = new DwellSystem({
          onSelect: handleResultAction,
          onProgress: (id, progress, active) => {
            const btn = actions.querySelector(`[data-ra="${id}"]`);
            if (!btn) return;
            btn.style.outline = active ? `2px solid rgba(0,240,255,${progress})` : '';
            btn.style.transform = active ? `scale(${1 + progress * 0.04})` : '';
          }
        });
        
        this.dwell.setDwellTime(this.state.get('dwell.ms'));
        this.dwell.setItems(targets.map(b => ({ id: b.dataset.ra, element: b })));
      } else {
        this.dwell = null;
      }
    }, 150);
  }

  _getModeLabel() {
    const mode = this.state.get('mode');
    switch(mode) {
      case 'head': return this.t('modeHeadOption');
      case 'eye': return this.t('modeEyeOption');
      case 'mouse': return this.t('modeMouseOption');
      default: return mode || this.t('home');
    }
  }

  showLesson() {
    if (typeof DB === 'undefined') return;
    
    const lessons = DB.getLessons(this.state.get('quiz.subject'), this.language);
    if (!lessons.length) return;
    
    let lessonIndex = 0;
    
    const showLessonPage = (idx) => {
      this.showScreen('l');
      const lesson = lessons[idx];
      
      const lc = document.getElementById('lc');
      const lpf = document.getElementById('lpf');
      const lbox = document.getElementById('lbox');
      const lnav = document.getElementById('lnav');
      
      if (lc) lc.textContent = this.t('lessonPage', { current: idx + 1, total: lessons.length });
      if (lpf) lpf.style.width = `${((idx + 1) / lessons.length) * 100}%`;
      if (lbox) lbox.innerHTML = `
        <div class="ltit">${lesson.title}</div>
        <div class="lp">${lesson.body}</div>
      `;
      
      if (lnav) {
        lnav.innerHTML = `
          ${idx > 0 ? `<button class="lbtn" data-a="prev">${this.t('lessonPrev')}</button>` : ''}
          <div class="lsep"></div>
          ${idx < lessons.length - 1 ? 
            `<button class="lbtn pri" data-a="next">${this.t('lessonNext')}</button>` : 
            `<button class="lbtn pri" data-a="quiz">${this.t('lessonQuizButton')} <span class="material-symbols-outlined icon icon-sm">edit</span></button>`}
        `;
      }
      
      if (typeof VoiceManager !== 'undefined') {
        const lessonTitle = typeof lesson.title === 'object' ? (lesson.title[this.language] || lesson.title.ar || '') : lesson.title;
        const lessonBody = typeof lesson.body === 'object' ? (lesson.body[this.language] || lesson.body.ar || '') : lesson.body;
        VoiceManager.speak(`${lessonTitle}. ${lessonBody.replace(/<[^>]+>/g, '')}`);
      }
      
      if (this.dwell && this.dwell.destroy) this.dwell.destroy();
      
      const navBtns = lnav ? Array.from(lnav.querySelectorAll('.lbtn')) : [];
      const isMouseMode = this.state.get('mode') === 'mouse';
      navBtns.forEach(btn => {
        btn.onclick = () => {
          const action = btn.dataset.a;
          if (action === 'next') showLessonPage(idx + 1);
          else if (action === 'prev') showLessonPage(idx - 1);
          else {
            const questions = DB.getQuestions(this.state.get('quiz.subject'), CONFIG.QUIZ.QUESTIONS_PER_ROUND, this.language);
            this.state.set('quiz.questions', questions);
            this.state.set('quiz.index', 0);
            this.state.set('quiz.score', 0);
            this.state.set('quiz.hesitations', 0);
            this.state.set('quiz.startTime', Date.now());
            this.showQuestion();
          }
        };
      });
      if (!isMouseMode) {
        this.dwell = new DwellSystem({
          onSelect: (action) => {
            if (action === 'next') showLessonPage(idx + 1);
            else if (action === 'prev') showLessonPage(idx - 1);
            else {
              const questions = DB.getQuestions(this.state.get('quiz.subject'), CONFIG.QUIZ.QUESTIONS_PER_ROUND, this.language);
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
      } else {
        this.dwell = null;
      }
    };
    
    showLessonPage(0);
  }

  /* ── Recalibration ── */
  recalibrate() {
    if (this.tracker && this.tracker.reset) {
      this.tracker.reset();
    }
    if (typeof VoiceManager !== 'undefined') {
      VoiceManager.speak(this.t('voiceRecalibrating'));
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
    if (typeof VoiceManager !== 'undefined') VoiceManager.speak(this.t('voiceSOSActive'));
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
    this.showScreen('welcome');
  }

  retry() {
    if (!this.state.get('quiz.subject')) return;
    if (typeof DB === 'undefined') return;
    
    const questions = DB.getQuestions(this.state.get('quiz.subject'), CONFIG.QUIZ.QUESTIONS_PER_ROUND, this.language);
    
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