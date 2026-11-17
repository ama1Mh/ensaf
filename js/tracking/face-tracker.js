/**
 * FaceTracker — head or eye (iris) pointer from MediaPipe Face Mesh.
 * Replaces the separate HeadTracker / EyeTracker classes.
 *
 * Privacy: frames are read from the local <video> element and processed by
 * MediaPipe's WebAssembly model inside the browser. No image or landmark is
 * ever sent anywhere (MediaPipe only downloads its model files from the CDN).
 *
 * Pipeline per frame:
 *   landmarks → raw pose (head: nose offset from face centre; eye: iris offset
 *   within the eye, blink-aware, falls back to head pose when the eyes are too
 *   small to measure) → mapping (calibration if any, else default gain ×
 *   sensitivity, around a re-centrable neutral pose) → screen px →
 *   One Euro filter + dead zone → onPoint(x, y, info)
 *
 * Robustness: face lost / back and low light are reported via onStatus().
 * Performance: frames are processed only when the previous one finished and
 * at most ~24 fps (adaptive down to 15 fps on slow laptops); the loop stops
 * when the tab is hidden and on stop().
 */
(function (root) {
  'use strict';

  const MP_VERSION = '0.4.1633559619';
  const MP_CDNS = [
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MP_VERSION}`,
    `https://unpkg.com/@mediapipe/face_mesh@${MP_VERSION}`
  ];
  let mpBase = null;
  let mpLoading = null;

  function loadScript(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      const timer = setTimeout(() => { s.remove(); reject(new Error('timeout ' + src)); }, timeoutMs);
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = () => { clearTimeout(timer); resolve(); };
      s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('failed ' + src)); };
      document.head.appendChild(s);
    });
  }

  /** Loads face_mesh.js once (tries a second CDN if the first fails). */
  function loadFaceMesh() {
    if (root.FaceMesh && mpBase) return Promise.resolve(mpBase);
    if (mpLoading) return mpLoading;
    mpLoading = (async () => {
      let lastErr;
      for (const base of MP_CDNS) {
        try {
          await loadScript(`${base}/face_mesh.js`, 15000);
          if (root.FaceMesh) { mpBase = base; return base; }
        } catch (e) { lastErr = e; }
      }
      mpLoading = null;
      throw lastErr || new Error('FaceMesh unavailable');
    })();
    return mpLoading;
  }

  const L = {
    NOSE: 1, FOREHEAD: 10, CHIN: 152, LEFT_CHEEK: 234, RIGHT_CHEEK: 454,
    L_IRIS: 468, R_IRIS: 473, L_OUT: 33, L_IN: 133, R_OUT: 362, R_IN: 263,
    L_UP: 159, L_LO: 145, R_UP: 386, R_LO: 374
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  class FaceTracker {
    /**
     * @param {object} o
     * @param {'head'|'eye'} o.mode
     * @param {(x:number,y:number,info:object)=>void} o.onPoint
     * @param {(status:string)=>void} o.onStatus  'noface' | 'face' | 'lowlight' | 'light-ok'
     * @param {() => object} o.getSettings        returns Settings.get()
     * @param {'new'|'legacy'} [o.filter]          legacy = original EMA (accuracy test only)
     */
    constructor({ mode = 'head', onPoint = () => {}, onStatus = () => {}, getSettings = () => ({}), filter = 'new' } = {}) {
      this.mode = mode;
      this.onPoint = onPoint;
      this.onStatus = onStatus;
      this.getSettings = getSettings;
      this.filterType = filter;
      this.faceMesh = null;
      this.video = null;
      this.running = false;
      this._raf = null;
      this._busy = false;
      this._lastSend = 0;
      this._minInterval = 1000 / 24;
      this._procAvg = 30;
      this.confidence = 0;
      this.neutral = { x: 0, y: 0 };
      this.lastRaw = null;
      this.lastPoint = { x: innerWidth / 2, y: innerHeight / 2 };
      this._noFaceSince = null;
      this._faceLostReported = false;
      this._lumaTimer = null;
      this._darkCount = 0;
      this._lowLightReported = false;
      this._makeFilter();
    }

    _makeFilter() {
      if (this.filterType === 'legacy') { this.filter = new root.LegacyEmaFilter(0.10); return; }
      const s = this.getSettings();
      this.filter = new root.PointFilter({
        minCutoff: root.Settings ? root.Settings.steadinessToCutoff(s.steadiness ?? 0.5) : 0.4,
        beta: 0.002,
        deadZone: 5
      });
    }

    /** Re-read steadiness after a settings change. */
    applySettings() {
      if (this.filterType === 'legacy' || !this.filter.configure) return;
      const s = this.getSettings();
      this.filter.configure({ minCutoff: root.Settings.steadinessToCutoff(s.steadiness ?? 0.5) });
    }

    async start(video) {
      this.video = video;
      const base = await loadFaceMesh();
      this.faceMesh = new root.FaceMesh({ locateFile: f => `${base}/${f}` });
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: this.mode === 'eye',   // iris landmarks 468–477 only when needed
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      this.faceMesh.onResults(r => this._onResults(r));
      if (typeof this.faceMesh.initialize === 'function') {
        await Promise.race([
          this.faceMesh.initialize(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('FaceMesh init timeout')), 25000))
        ]);
      }
      this.running = true;
      this._loop();
      this._lumaTimer = setInterval(() => this._checkLight(), 2000);
    }

    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      clearInterval(this._lumaTimer);
      if (this.faceMesh) { try { this.faceMesh.close(); } catch (e) { /* ignore */ } }
      this.faceMesh = null;
    }

    /** Use the current head/eye pose as the screen centre. */
    recenter() {
      if (this.lastRaw) { this.neutral = { ...this.lastRaw }; this._recentered = true; }
      this.filter.reset();
    }

    getRaw() { return this.lastRaw ? { ...this.lastRaw } : null; }

    _loop() {
      if (!this.running) return;
      this._raf = requestAnimationFrame(() => this._loop());
      const v = this.video;
      if (document.hidden || this._busy || !v || v.readyState < 2) return;
      const now = performance.now();
      if (now - this._lastSend < this._minInterval) return;
      this._lastSend = now;
      this._busy = true;
      const t0 = now;
      this.faceMesh.send({ image: v })
        .catch(() => { /* a single bad frame is fine */ })
        .finally(() => {
          this._busy = false;
          // Adapt the rate to the machine: slow laptops get fewer frames.
          this._procAvg = this._procAvg * 0.9 + (performance.now() - t0) * 0.1;
          this._minInterval = Math.min(1000 / 15, Math.max(1000 / 24, this._procAvg * 1.2));
        });
    }

    _checkLight() {
      const v = this.video;
      if (!v || v.readyState < 2) return;
      try {
        if (!this._lumaCanvas) { this._lumaCanvas = document.createElement('canvas'); this._lumaCanvas.width = 32; this._lumaCanvas.height = 24; }
        const c = this._lumaCanvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(v, 0, 0, 32, 24);
        const d = c.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const luma = sum / (d.length / 4);
        this._darkCount = luma < 45 ? this._darkCount + 1 : 0;
        if (this._darkCount >= 2 && !this._lowLightReported) { this._lowLightReported = true; this.onStatus('lowlight'); }
        else if (this._darkCount === 0 && this._lowLightReported) { this._lowLightReported = false; this.onStatus('light-ok'); }
      } catch (e) { /* tainted canvas etc. — ignore */ }
    }

    _headRaw(lm) {
      const faceCX = (lm[L.LEFT_CHEEK].x + lm[L.RIGHT_CHEEK].x) / 2;
      const faceCY = (lm[L.FOREHEAD].y + lm[L.CHIN].y) / 2;
      const faceW = Math.abs(lm[L.RIGHT_CHEEK].x - lm[L.LEFT_CHEEK].x);
      const faceH = Math.abs(lm[L.CHIN].y - lm[L.FOREHEAD].y);
      return {
        x: faceW > 0.01 ? -(lm[L.NOSE].x - faceCX) / faceW : 0,   // mirrored: turn right → cursor right
        y: faceH > 0.01 ? (lm[L.NOSE].y - faceCY) / faceH : 0
      };
    }

    /** Iris offset inside each eye. Returns null when it cannot be measured. */
    _eyeRaw(lm) {
      if (lm.length < 478) return { usable: false };
      const lW = dist(lm[L.L_OUT], lm[L.L_IN]);
      const rW = dist(lm[L.R_OUT], lm[L.R_IN]);
      const avgW = (lW + rW) / 2;
      const ear = (dist(lm[L.L_UP], lm[L.L_LO]) / Math.max(lW, 1e-3) + dist(lm[L.R_UP], lm[L.R_LO]) / Math.max(rW, 1e-3)) / 2;
      if (avgW < 0.02) return { usable: false };           // face too far: iris too small to measure
      if (ear < 0.16) return { usable: true, blink: true };  // eyes closed: hold the cursor
      const lc = { x: (lm[L.L_OUT].x + lm[L.L_IN].x) / 2, y: (lm[L.L_OUT].y + lm[L.L_IN].y) / 2 };
      const rc = { x: (lm[L.R_OUT].x + lm[L.R_IN].x) / 2, y: (lm[L.R_OUT].y + lm[L.R_IN].y) / 2 };
      const x = ((lm[L.L_IRIS].x - lc.x) / lW + (lm[L.R_IRIS].x - rc.x) / rW) / 2;
      const y = ((lm[L.L_IRIS].y - lc.y) / lW + (lm[L.R_IRIS].y - rc.y) / rW) / 2;
      return { usable: true, blink: false, x, y };
    }

    _map(raw, source) {
      const s = this.getSettings();
      const cal = s.calibration && s.calibration[this.mode];
      let nx, ny;
      if (cal && source === this.mode) {
        // Calibrated: screen = 0.5 + (raw − centre) × gain, where the centre is the
        // calibrated neutral pose unless the student re-centred since.
        const c = this._recentered ? this.neutral : { x: cal.cx, y: cal.cy };
        nx = 0.5 + (raw.x - c.x) * cal.sx;
        ny = 0.5 + (raw.y - c.y) * cal.sy;
      } else {
        const sens = s.sensitivity || 1;
        const g = source === 'eye'
          ? { x: CONFIG.EYE_TRACKING.SENSITIVITY.X, y: CONFIG.EYE_TRACKING.SENSITIVITY.Y }
          : { x: CONFIG.HEAD_TRACKING.SENSITIVITY_X, y: CONFIG.HEAD_TRACKING.SENSITIVITY_Y };
        const n = source === this.mode ? this.neutral : { x: 0, y: 0 };
        nx = 0.5 + (raw.x - n.x) * g.x * sens;
        ny = 0.5 + (raw.y - n.y) * g.y * sens;
        if (source === 'eye') {
          // Stretch [0.05, 0.95] → [0, 1] so the eyes can reach the screen edges.
          nx = (clamp01(nx) - 0.05) / 0.9;
          ny = (clamp01(ny) - 0.05) / 0.9;
        }
      }
      return { x: clamp01(nx) * innerWidth, y: clamp01(ny) * innerHeight };
    }

    _onResults(results) {
      const now = performance.now();
      const lm = results.multiFaceLandmarks && results.multiFaceLandmarks[0];

      if (!lm) {
        this.confidence = Math.max(0, this.confidence - 0.1);
        if (this._noFaceSince === null) this._noFaceSince = now;
        if (!this._faceLostReported && now - this._noFaceSince > 1200) {
          this._faceLostReported = true;
          this.onStatus('noface');
        }
        this.onPoint(this.lastPoint.x, this.lastPoint.y, { confidence: this.confidence, face: false });
        return;
      }

      this._noFaceSince = null;
      if (this._faceLostReported) { this._faceLostReported = false; this.onStatus('face'); }
      this.confidence = Math.min(1, this.confidence + 0.15);

      let raw, source = 'head';
      if (this.mode === 'eye') {
        const e = this._eyeRaw(lm);
        if (e.usable && e.blink) {
          this.onPoint(this.lastPoint.x, this.lastPoint.y, { confidence: this.confidence, face: true, blink: true, source: 'eye' });
          return;
        }
        if (e.usable) { raw = { x: e.x, y: e.y }; source = 'eye'; }
        else raw = this._headRaw(lm);   // iris → head-pose fallback (smoothed by the filter)
      } else {
        raw = this._headRaw(lm);
      }
      if (source === this.mode) this.lastRaw = raw;

      const target = this._map(raw, source);
      const p = this.filterType === 'legacy' ? this.filter.filter(target.x, target.y) : this.filter.filter(target.x, target.y, now);
      this.lastPoint = p;
      this.onPoint(p.x, p.y, { confidence: this.confidence, face: true, source });
    }
  }

  root.FaceTracker = FaceTracker;
  root.loadFaceMesh = loadFaceMesh;
})(window);
