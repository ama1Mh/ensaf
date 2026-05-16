const CONFIG = {
  // App Settings
  APP: {
    NAME: 'ENSAF',
    VERSION: '4.0.0',
    MODES: ['head', 'eye', 'mouse'],
    DEFAULT_MODE: 'head'
  },
  
  // Head Tracking
  HEAD_TRACKING: {
    SMOOTHING_ALPHA: 0.10,
    SENSITIVITY_X: 2.8,
    SENSITIVITY_Y: 2.5,
    KEY_LANDMARKS: {
      NOSE_TIP: 1,
      FOREHEAD: 10,
      CHIN: 152,
      LEFT_CHEEK: 234,
      RIGHT_CHEEK: 454
    }
  },
  
  // Eye Tracking (Iris-based)
EYE_TRACKING: {
  USE_IRIS: true,
  SMOOTHING: {
    SLOW_EMA: 0.08,   // Slightly faster for eye tracking
    FAST_EMA: 0.22
  },
  CONFIDENCE_THRESHOLD: 0.55,
  SENSITIVITY: {
    X: 5.0,  // Tuned from real data: iris offset ≈ ±0.10, need ×5 to span full screen
    Y: 4.5   // Slightly less vertical (eyes move less up/down)
  },
  KEY_LANDMARKS: {
    LEFT_IRIS: 468,
    RIGHT_IRIS: 473,
    LEFT_EYE_OUTER: 33,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_OUTER: 362,
    RIGHT_EYE_INNER: 263
  }
},

  
  // Dwell
  DWELL: {
    DEFAULT_MS: 3500,
    MIN_MS: 1000,
    MAX_MS: 8000,
    STEP_MS: 500
  },
  
  // Quiz
  QUIZ: {
    QUESTIONS_PER_ROUND: 5,
    HESITATION_TIMEOUT: 6000,
    ANSWER_DELAY: 2200
  },
  
  // Camera
  CAMERA: {
    WIDTH: 640,
    HEIGHT: 480,
    FRAMERATE: 30,
    FACING_MODE: 'user'
  },
  
  // Voice
  VOICE: {
    LANG: 'ar-SA',
    RATE: 0.92,
    PITCH: 1.04
  },

  // Firebase optional settings — fill this with your Firebase config if you want real auth
  FIREBASE: {
    enabled: true,
    // If true, local fallback auth is disabled and Firebase is required
    requireAuth: true,
    config: {
      apiKey: "AIzaSyBD_Mby6Jv6t7Z--vZEeQPkEXA9ULyX638",
      authDomain: "ensaf-134dc.firebaseapp.com",
      projectId: "ensaf-134dc",
      storageBucket: "ensaf-134dc.firebasestorage.app",
      messagingSenderId: "310365784197",
      appId: "1:310365784197:web:9fa3d6b201a76b9b8901ec",
      measurementId: "G-M5YLCNPLM9"
    }
  }
};