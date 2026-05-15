class BaseTracker {
  constructor() {
    this.listeners = [];
    this.confidence = 0;
    this.tracking = false;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  _emit(x, y, confidence, tracking) {
    this.x = x;
    this.y = y;
    this.confidence = confidence;
    this.tracking = tracking;
    this.listeners.forEach(cb => cb(x, y, confidence, tracking));
  }

  async init() {
    throw new Error('Must implement init()');
  }

  async startCamera(videoElement) {
    throw new Error('Must implement startCamera()');
  }
}