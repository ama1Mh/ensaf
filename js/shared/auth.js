class AuthManager {
  constructor() {
    this.userKey = 'user';
    this.usersKey = 'auth_users';
    this.user = null;
  }

  async _waitForFirebaseAuthApi(timeoutMs = 3000) {
    if (!window.CONFIG || !window.CONFIG.FIREBASE || !window.CONFIG.FIREBASE.enabled) {
      return false;
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.FirebaseAuthApi) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return !!window.FirebaseAuthApi;
  }

  _attachFirebaseListener() {
    if (!window.FirebaseAuthApi) return;
    console.log('[Auth] Firebase is enabled, attaching auth state listener');
    try {
      window.FirebaseAuthApi.onAuthStateChanged((fbUser) => {
        console.log('[Auth] Firebase auth state changed:', fbUser);
        if (fbUser) {
          window.FirebaseAuthApi.getUserProfile(fbUser.uid).then(profile => {
            if (!profile) {
              console.warn('[Auth] Firestore profile not found for uid', fbUser.uid);
            }
            const prefs = (profile && profile.preferences) ? profile.preferences : (this.user ? this.user.preferences || {} : {});
            this.user = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email || fbUser.uid,
              email: fbUser.email || '',
              preferences: prefs
            };
            this._persistUser();
          }).catch((err) => {
            console.warn('[Auth] Failed to load Firestore profile', err);
            this.user = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email || fbUser.uid,
              email: fbUser.email || '',
              preferences: this.user ? this.user.preferences || {} : {}
            };
            this._persistUser();
          });
        } else {
          // keep local guest or null
        }
      });
    } catch (e) {
      console.warn('[Auth] Firebase listener failed', e);
    }
  }

  init() {
    this.user = utils.loadFromStorage(this.userKey, null);
    console.log('[Auth] init local user:', this.user);

    // If Firebase is enabled, wait for its API and listen for auth state changes
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled) {
      console.log('[Auth] Firebase enabled, waiting for FirebaseAuthApi');
      this._waitForFirebaseAuthApi().then(ready => {
        if (ready) {
          this._attachFirebaseListener();
        } else {
          console.warn('[Auth] FirebaseAuthApi not available after wait');
          if (window.CONFIG.FIREBASE.requireAuth) {
            this.user = null;
            this._persistUser();
          }
        }
      });
    }
    // If Firebase is required but not available, clear user
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.requireAuth && (!window.FirebaseAuthApi || !window.CONFIG.FIREBASE.enabled)) {
      this.user = null;
      this._persistUser();
    }
  }

  isSignedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  continueAsGuest() {
    this.user = {
      id: 'guest',
      name: 'Guest',
      email: '',
      preferences: {
        mode: CONFIG.APP.DEFAULT_MODE,
        theme: localStorage.getItem('ensaf-theme') || 'default',
        language: localStorage.getItem('ensaf-lang') || 'ar'
      },
      isGuest: true
    };
    this._persistUser();
    return this.user;
  }

  async signIn(email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    // If Firebase is enabled, wait for its API before delegating
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled) {
      if (!window.FirebaseAuthApi) {
        console.log('[Auth] waiting for FirebaseAuthApi before signIn');
        await this._waitForFirebaseAuthApi();
      }
      if (window.FirebaseAuthApi) {
        console.log('[Auth] signing in with Firebase:', normalizedEmail);
        const res = await window.FirebaseAuthApi.signIn(normalizedEmail, password);
        if (!res.success) {
          console.warn('[Auth] Firebase signIn failed:', res.message);
          return { success: false, message: res.message };
        }

        const fb = res.user;
        let profile = null;
        try {
          profile = await window.FirebaseAuthApi.getUserProfile(fb.uid);
          if (!profile) {
            console.warn('[Auth] No Firestore profile for uid', fb.uid, '- creating default profile');
            const initialPrefs = {
              mode: CONFIG.APP.DEFAULT_MODE,
              theme: localStorage.getItem('ensaf-theme') || 'default',
              language: localStorage.getItem('ensaf-lang') || 'ar'
            };
            const createRes = await window.FirebaseAuthApi.saveUserProfile(fb.uid, { preferences: initialPrefs });
            if (!createRes.success) {
              console.warn('[Auth] Failed to create Firestore profile on login:', createRes.message);
            } else {
              profile = { preferences: initialPrefs };
            }
          }
        } catch (err) {
          console.warn('[Auth] Failed to load Firestore profile after sign in', err);
        }

        const prefs = (profile && profile.preferences) ? profile.preferences : {};
        this.user = { id: fb.uid, name: fb.displayName || fb.email, email: fb.email, preferences: prefs };
        this._persistUser();
        return { success: true, message: 'Signed in (firebase).' };
      }
    }

    // If requireAuth is true, do not allow local auth
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.requireAuth) {
      return { success: false, message: 'Authentication requires Firebase. Local auth is disabled.' };
    }

    const users = this._loadUsers();
    const user = users.find(u => u.email === normalizedEmail && u.password === password);
    if (!user) {
      return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    }

    this.user = { ...user, isGuest: false };
    delete this.user.password;
    this._persistUser();
    return { success: true, message: 'Signed in successfully.' };
  }

  async signUp(name, email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!name || !normalizedEmail || !password) {
      return { success: false, message: 'Name, email and password are required.' };
    }

    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled) {
      if (!window.FirebaseAuthApi) {
        console.log('[Auth] waiting for FirebaseAuthApi before signUp');
        await this._waitForFirebaseAuthApi();
      }
      if (window.FirebaseAuthApi) {
        console.log('[Auth] signing up with Firebase:', normalizedEmail);
        const res = await window.FirebaseAuthApi.signUp(name, normalizedEmail, password);
        if (!res.success) {
          console.warn('[Auth] Firebase signUp failed:', res.message);
          return { success: false, message: res.message };
        }
        const fb = res.user;
        console.log('[Auth] Firebase signUp success, uid:', fb?.uid);
        const initialPrefs = {
          mode: CONFIG.APP.DEFAULT_MODE,
          theme: localStorage.getItem('ensaf-theme') || 'default',
          language: localStorage.getItem('ensaf-lang') || 'ar'
        };
        this.user = { id: fb.uid, name: fb.displayName || name, email: fb.email, preferences: initialPrefs };
        try {
          const saveRes = await window.FirebaseAuthApi.saveUserProfile(fb.uid, { preferences: initialPrefs });
          this._persistUser();
          return { success: true, message: 'Account created (firebase).', synced: !!(saveRes && saveRes.success) };
        } catch (e) {
          this._persistUser();
          return { success: true, message: 'Account created (firebase).', synced: false };
        }
      }
    }

    // If requireAuth is true, do not allow local signup
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.requireAuth) {
      return { success: false, message: 'Account creation requires Firebase. Local signup is disabled.' };
    }

    const users = this._loadUsers();
    if (users.some(u => u.email === normalizedEmail)) {
      return { success: false, message: 'هذا البريد الإلكتروني مستخدم بالفعل.' };
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      preferences: {
        mode: CONFIG.APP.DEFAULT_MODE,
        theme: localStorage.getItem('ensaf-theme') || 'default',
        language: localStorage.getItem('ensaf-lang') || 'ar'
      }
    };

    users.push(newUser);
    this._saveUsers(users);
    this.user = { ...newUser, isGuest: false };
    delete this.user.password;
    this._persistUser();
    return { success: true, message: 'Account created successfully.' };
  }

  async sendPasswordReset(email) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, message: 'Please enter an email address.' };
    }

    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled) {
      if (!window.FirebaseAuthApi) {
        console.log('[Auth] waiting for FirebaseAuthApi before sendPasswordReset');
        await this._waitForFirebaseAuthApi();
      }
      if (window.FirebaseAuthApi) {
        const res = await window.FirebaseAuthApi.sendPasswordReset(normalizedEmail);
        if (!res.success) return { success: false, message: res.message };
        return { success: true, message: 'Password reset sent (firebase).' };
      }
    }

    const users = this._loadUsers();
    const user = users.find(u => u.email === normalizedEmail);
    if (!user) {
      return { success: false, message: 'لم يتم العثور على حساب لهذا البريد الإلكتروني.' };
    }

    return {
      success: true,
      message: 'An email would be sent with password reset instructions in a real Firebase setup.'
    };
  }

  signOut() {
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi) {
      return window.FirebaseAuthApi.signOut().then(() => {
        this.user = null;
        this._persistUser();
        return { success: true };
      }).catch(e => ({ success: false, message: e.message }));
    }

    this.user = null;
    this._persistUser();
    return { success: true };
  }

  updateProfile(profile) {
    if (!this.user) return null;
    this.user = {
      ...this.user,
      ...profile,
      preferences: {
        ...this.user.preferences,
        ...(profile.preferences || {})
      }
    };
    this._persistUser();
    return this.user;
  }

  savePreferences(preferences) {
    if (!this.user) return null;
    this.user.preferences = {
      ...this.user.preferences,
      ...preferences
    };
    // persist to Firestore when available
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi && this.user.id && this.user.id !== 'guest') {
      console.log('[Auth] saving preferences to Firestore for uid', this.user.id, this.user.preferences);
      return window.FirebaseAuthApi.saveUserProfile(this.user.id, { preferences: this.user.preferences }).then(res => {
        this._persistUser();
        if (!res.success) {
          console.warn('[Auth] saveUserProfile failed:', res.message);
        }
        return res;
      }).catch(err => {
        this._persistUser();
        console.warn('[Auth] saveUserProfile exception:', err);
        return { success: false, message: err?.message || String(err) };
      });
    }
    this._persistUser();
    return { success: true };
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
}
