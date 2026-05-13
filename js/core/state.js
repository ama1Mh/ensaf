class AppState {
  constructor() {
    this._state = {
      mode: CONFIG.APP.DEFAULT_MODE,
      screen: 'welcome',
      tracking: {
        active: false,
        confidence: 0,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      },
      quiz: {
        subject: null,
        questions: [],
        index: 0,
        score: 0,
        hesitations: 0,
        startTime: 0
      },
      dwell: {
        ms: CONFIG.DWELL.DEFAULT_MS,
        active: false
      },
      sos: {
        active: false,
        startTime: null
      }
    };
    this._listeners = new Map();
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this._state);
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => {
      if (!obj[k]) obj[k] = {};
      return obj[k];
    }, this._state);
    target[lastKey] = value;
    this._notify(key);
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  _notify(key) {
    if (this._listeners.has(key)) {
      this._listeners.get(key).forEach(cb => cb(this.get(key)));
    }
  }
}

const STATE = new AppState();