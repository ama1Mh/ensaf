/**
 * AuthManager — wraps Firebase Auth (via window.FirebaseAuthApi from
 * firebase-init.js) with a localStorage fallback when Firebase is disabled.
 *
 * - The last signed-in user is cached in localStorage so the UI can render
 *   immediately on reload; Firebase's onAuthStateChanged then confirms or
 *   clears it.
 * - Subscribers registered with onChange(cb) are notified whenever the user
 *   changes (sign in, sign out, profile loaded, session expired…).
 * - Failed calls return { success:false, errorKey, message } where errorKey is
 *   an i18n key the app can translate.
 */

const AUTH_ERROR_KEYS = {
  'auth/invalid-email': 'authErrInvalidEmail',
  'auth/missing-email': 'authErrInvalidEmail',
  'auth/user-not-found': 'authErrInvalidCredentials',
  'auth/wrong-password': 'authErrInvalidCredentials',
  'auth/invalid-credential': 'authErrInvalidCredentials',
  'auth/invalid-login-credentials': 'authErrInvalidCredentials',
  'auth/email-already-in-use': 'authErrEmailInUse',
  'auth/weak-password': 'authErrWeakPassword',
  'auth/missing-password': 'authErrMissingFields',
  'auth/too-many-requests': 'authErrTooManyRequests',
  'auth/network-request-failed': 'authErrNetwork',
  'auth/user-disabled': 'authErrUserDisabled',
  'auth/operation-not-allowed': 'authErrNotEnabled',
  'auth/configuration-not-found': 'authErrNotEnabled',
  'auth/unauthorized-domain': 'authErrUnauthorizedDomain',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'authErrConfig',
  'permission-denied': 'authErrPermission',
  'unavailable': 'authErrNetwork'
};

class AuthManager {
  constructor() {
    this.userKey = 'user';
    this.usersKey = 'auth_users';
    this.user = null;
    this._listeners = [];
    this._unsubscribe = null;
    this._resolveReady = null;
    // Resolves once we know the real auth state (first Firebase callback,
    // or immediately when Firebase is disabled/unavailable).
    this.ready = new Promise(resolve => { this._resolveReady = resolve; });
  }

  // ── Config helpers ──────────────────────────────────────────
  get firebaseEnabled() {
    return !!(window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled);
  }

  get requireAuth() {
    return !!(window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.requireAuth);
  }

  get usingFirebase() {
    return this.firebaseEnabled && !!window.FirebaseAuthApi;
  }

  // ── Subscription ────────────────────────────────────────────
  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  _emit(reason) {
    this._listeners.forEach(cb => {
      try { cb(this.user, reason); } catch (e) { console.error('[Auth] listener error', e); }
    });
  }

  _setUser(user, reason) {
    this.user = user;
    this._persistUser();
    this._emit(reason);
  }

  // ── Firebase bootstrap ──────────────────────────────────────
  _waitForFirebaseAuthApi(timeoutMs = 10000) {
    if (!this.firebaseEnabled) return Promise.resolve(false);
    if (window.FirebaseAuthApi) return Promise.resolve(true);
    // firebase-init.js (or its gstatic imports) failed to load: offline or blocked.
    if (window.__firebaseFailed) return Promise.resolve(false);

    return new Promise(resolve => {
      const done = (ok) => {
        clearTimeout(timer);
        clearInterval(poll);
        window.removeEventListener('firebase-ready', onReady);
        resolve(ok);
      };
      const onReady = (e) => done(!!(e.detail && e.detail.ok) && !!window.FirebaseAuthApi);
      const poll = setInterval(() => { if (window.FirebaseAuthApi) done(true); }, 100);
      const timer = setTimeout(() => done(!!window.FirebaseAuthApi), timeoutMs);
      window.addEventListener('firebase-ready', onReady);
    });
  }

  _defaultPreferences() {
    return {
      mode: CONFIG.APP.DEFAULT_MODE,
      theme: localStorage.getItem('ensaf-theme') || 'default',
      language: localStorage.getItem('ensaf-lang') || 'ar'
    };
  }

  _userFromFirebase(fbUser, preferences) {
    return {
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
      email: fbUser.email || '',
      preferences: preferences || {},
      isGuest: false
    };
  }

  /** Loads users/{uid}; creates it with defaults if missing. Returns preferences. */
  async _loadOrCreateProfile(fbUser, nameHint) {
    const api = window.FirebaseAuthApi;
    let profile = await api.getUserProfile(fbUser.uid);
    if (!profile) {
      const preferences = this._defaultPreferences();
      const res = await api.saveUserProfile(fbUser.uid, {
        name: nameHint || fbUser.displayName || '',
        email: fbUser.email || '',
        preferences
      }, { isNew: true });
      if (!res.success) console.warn('[Auth] Could not create Firestore profile:', res.code, res.message);
      profile = { preferences };
    }
    return { ...this._defaultPreferences(), ...(profile.preferences || {}) };
  }

  _attachFirebaseListener() {
    if (this._unsubscribe || !window.FirebaseAuthApi) return;
    let first = true;

    this._unsubscribe = window.FirebaseAuthApi.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        const cachedPrefs = (this.user && this.user.id === fbUser.uid) ? this.user.preferences : null;
        // Render immediately with what we have, then refine with Firestore.
        if (!this.user || this.user.id !== fbUser.uid) {
          this._setUser(this._userFromFirebase(fbUser, cachedPrefs || this._defaultPreferences()), 'session');
        }
        try {
          const prefs = await this._loadOrCreateProfile(fbUser);
          if (this.user && this.user.id === fbUser.uid) {
            this._setUser(this._userFromFirebase(fbUser, prefs), 'profile');
          }
        } catch (e) {
          console.warn('[Auth] Failed to load Firestore profile', e);
        }
      } else if (this.user && !(this.user.isGuest && !this.requireAuth)) {
        // Session ended (signed out elsewhere, token revoked, or cached user is stale).
        this._setUser(null, 'signed-out');
      }

      if (first) { first = false; this._resolveReady(); }
    });
  }

  init() {
    this.user = utils.loadFromStorage(this.userKey, null);
    if (this.user && this.user.isGuest && this.requireAuth) {
      this.user = null;
      this._persistUser();
    }

    if (!this.firebaseEnabled) {
      this._resolveReady();
      return this.ready;
    }

    this._waitForFirebaseAuthApi().then(ok => {
      if (ok) {
        this._attachFirebaseListener();
      } else {
        console.info('[Auth] Firebase did not load — check your network or the config in js/config.js');
        if (this.requireAuth && this.user) this._setUser(null, 'firebase-unavailable');
        this._resolveReady();
      }
    });
    return this.ready;
  }

  isSignedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  continueAsGuest() {
    this._setUser({
      id: 'guest',
      name: 'Guest',
      email: '',
      preferences: this._defaultPreferences(),
      isGuest: true
    }, 'guest');
    return this.user;
  }

  _error(code, fallbackMessage) {
    return {
      success: false,
      code,
      errorKey: AUTH_ERROR_KEYS[code] || null,
      message: fallbackMessage || code
    };
  }

  async _requireFirebaseApi() {
    if (!this.firebaseEnabled) return false;
    if (!window.FirebaseAuthApi) await this._waitForFirebaseAuthApi();
    return !!window.FirebaseAuthApi;
  }

  async signIn(email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail || !password) return this._error('missing-fields', 'Email and password are required.');
    if (!this._isValidEmail(normalizedEmail)) return this._error('auth/invalid-email');

    if (await this._requireFirebaseApi()) {
      const res = await window.FirebaseAuthApi.signIn(normalizedEmail, password);
      if (!res.success) return this._error(res.code, res.message);

      let prefs = this._defaultPreferences();
      try { prefs = await this._loadOrCreateProfile(res.user); }
      catch (e) { console.warn('[Auth] profile load after sign in failed', e); }
      this._attachFirebaseListener();
      this._setUser(this._userFromFirebase(res.user, prefs), 'signed-in');
      return { success: true };
    }

    if (this.firebaseEnabled || this.requireAuth) return this._error('firebase-unavailable');

    // Local fallback (Firebase disabled) — demo only, stored in this browser.
    const users = this._loadUsers();
    const hash = await this._hash(password);
    const user = users.find(u => u.email === normalizedEmail && (u.passwordHash === hash || u.password === password));
    if (!user) return this._error('auth/invalid-credential');
    const { password: _p, passwordHash: _h, ...safe } = user;
    this._setUser({ ...safe, isGuest: false }, 'signed-in');
    return { success: true };
  }

  async signUp(name, email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    const cleanName = (name || '').trim();
    if (!cleanName || !normalizedEmail || !password) return this._error('missing-fields', 'Name, email and password are required.');
    if (!this._isValidEmail(normalizedEmail)) return this._error('auth/invalid-email');
    if (password.length < 6) return this._error('auth/weak-password');

    if (await this._requireFirebaseApi()) {
      const res = await window.FirebaseAuthApi.signUp(cleanName, normalizedEmail, password);
      if (!res.success) return this._error(res.code, res.message);

      const preferences = this._defaultPreferences();
      const saveRes = await window.FirebaseAuthApi.saveUserProfile(res.user.uid, {
        name: cleanName,
        email: normalizedEmail,
        preferences
      }, { isNew: true });
      this._attachFirebaseListener();
      this._setUser({ ...this._userFromFirebase(res.user, preferences), name: cleanName }, 'signed-up');
      return { success: true, synced: !!saveRes.success, syncError: saveRes.success ? null : this._error(saveRes.code, saveRes.message) };
    }

    if (this.firebaseEnabled || this.requireAuth) return this._error('firebase-unavailable');

    const users = this._loadUsers();
    if (users.some(u => u.email === normalizedEmail)) return this._error('auth/email-already-in-use');
    const newUser = {
      id: `u_${Date.now()}`,
      name: cleanName,
      email: normalizedEmail,
      passwordHash: await this._hash(password),
      preferences: this._defaultPreferences()
    };
    users.push(newUser);
    this._saveUsers(users);
    const { passwordHash: _h, ...safe } = newUser;
    this._setUser({ ...safe, isGuest: false }, 'signed-up');
    return { success: true, synced: true };
  }

  async sendPasswordReset(email) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail) return this._error('auth/missing-email');
    if (!this._isValidEmail(normalizedEmail)) return this._error('auth/invalid-email');

    if (await this._requireFirebaseApi()) {
      const res = await window.FirebaseAuthApi.sendPasswordReset(normalizedEmail);
      // Firebase may not reveal whether the account exists (email enumeration
      // protection), so treat success uniformly.
      return res.success ? { success: true } : this._error(res.code, res.message);
    }
    if (this.firebaseEnabled || this.requireAuth) return this._error('firebase-unavailable');
    return this._error('reset-unavailable', 'Password reset needs Firebase.');
  }

  async signOut() {
    if (this.usingFirebase && this.user && !this.user.isGuest) {
      const res = await window.FirebaseAuthApi.signOut();
      if (!res.success) return this._error(res.code, res.message);
    }
    this._setUser(null, 'signed-out');
    return { success: true };
  }

  async savePreferences(preferences) {
    if (!this.user) return { success: false, message: 'Not signed in' };
    this.user = { ...this.user, preferences: { ...this.user.preferences, ...preferences } };
    this._persistUser();

    if (this.usingFirebase && !this.user.isGuest) {
      const res = await window.FirebaseAuthApi.saveUserProfile(this.user.id, { preferences: this.user.preferences });
      if (!res.success) return this._error(res.code, res.message);
    }
    return { success: true };
  }

  /** Saves a finished quiz to Firestore (signed-in users) or localStorage. */
  async saveQuizResult(result) {
    if (!this.user) return { success: false };
    if (this.usingFirebase && !this.user.isGuest) {
      const res = await window.FirebaseAuthApi.saveQuizResult(this.user.id, result);
      return res.success ? res : this._error(res.code, res.message);
    }
    const key = `results_${this.user.id}`;
    const list = utils.loadFromStorage(key, []);
    list.unshift({ ...result, createdAt: new Date().toISOString() });
    utils.saveToStorage(key, list.slice(0, 50));
    return { success: true };
  }

  async getQuizResults(max = 10) {
    if (!this.user) return [];
    if (this.usingFirebase && !this.user.isGuest) {
      return window.FirebaseAuthApi.getQuizResults(this.user.id, max);
    }
    return utils.loadFromStorage(`results_${this.user.id}`, [])
      .slice(0, max)
      .map(r => ({ ...r, createdAt: r.createdAt ? new Date(r.createdAt) : null }));
  }

  // ── Internals ───────────────────────────────────────────────
  async _hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return text; // crypto.subtle unavailable (non-secure context)
    }
  }

  _loadUsers() {
    return utils.loadFromStorage(this.usersKey, []);
  }

  _saveUsers(users) {
    utils.saveToStorage(this.usersKey, users);
  }

  _persistUser() {
    utils.saveToStorage(this.userKey, this.user);
  }

  _normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
