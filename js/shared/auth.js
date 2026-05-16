class AuthManager {
  constructor() {
    this.userKey = 'user';
    this.usersKey = 'auth_users';
    this.user = null;
  }

  init() {
    this.user = utils.loadFromStorage(this.userKey, null);

    // If Firebase is enabled, listen for auth state changes and prefer Firebase user
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi) {
      try {
        window.FirebaseAuthApi.onAuthStateChanged((fbUser) => {
          if (fbUser) {
            // load server-side profile if available
            window.FirebaseAuthApi.getUserProfile(fbUser.uid).then(profile => {
              const prefs = (profile && profile.preferences) ? profile.preferences : (this.user ? this.user.preferences || {} : {});
              this.user = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email || fbUser.uid,
                email: fbUser.email || '',
                preferences: prefs
              };
              this._persistUser();
            }).catch(() => {
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

  signIn(email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    // If Firebase is enabled, delegate to Firebase
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi) {
      return window.FirebaseAuthApi.signIn(normalizedEmail, password).then(res => {
        if (!res.success) return { success: false, message: res.message };
        const fb = res.user;
        // load profile from Firestore
        return window.FirebaseAuthApi.getUserProfile(fb.uid).then(profile => {
          const prefs = (profile && profile.preferences) ? profile.preferences : {};
          this.user = { id: fb.uid, name: fb.displayName || fb.email, email: fb.email, preferences: prefs };
          this._persistUser();
          return { success: true, message: 'Signed in (firebase).' };
        }).catch(() => {
          this.user = { id: fb.uid, name: fb.displayName || fb.email, email: fb.email, preferences: {} };
          this._persistUser();
          return { success: true, message: 'Signed in (firebase).' };
        });
      });
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

  signUp(name, email, password) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!name || !normalizedEmail || !password) {
      return { success: false, message: 'Name, email and password are required.' };
    }

    // If Firebase enabled, use Firebase createUser
    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi) {
      return window.FirebaseAuthApi.signUp(name, normalizedEmail, password).then(async res => {
        if (!res.success) return { success: false, message: res.message };
        const fb = res.user;
        // create initial profile document
        const initialPrefs = {
          mode: CONFIG.APP.DEFAULT_MODE,
          theme: localStorage.getItem('ensaf-theme') || 'default',
          language: localStorage.getItem('ensaf-lang') || 'ar'
        };
        this.user = { id: fb.uid, name: fb.displayName || name, email: fb.email, preferences: initialPrefs };
        // save to Firestore and wait for sync result
        try {
          const saveRes = await window.FirebaseAuthApi.saveUserProfile(fb.uid, { preferences: initialPrefs });
          this._persistUser();
          return { success: true, message: 'Account created (firebase).', synced: !!(saveRes && saveRes.success) };
        } catch (e) {
          this._persistUser();
          return { success: true, message: 'Account created (firebase).', synced: false };
        }
      });
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

  sendPasswordReset(email) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, message: 'Please enter an email address.' };
    }

    if (window.CONFIG && window.CONFIG.FIREBASE && window.CONFIG.FIREBASE.enabled && window.FirebaseAuthApi) {
      return window.FirebaseAuthApi.sendPasswordReset(normalizedEmail).then(res => {
        if (!res.success) return { success: false, message: res.message };
        return { success: true, message: 'Password reset sent (firebase).' };
      });
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
      return window.FirebaseAuthApi.saveUserProfile(this.user.id, { preferences: this.user.preferences }).then(res => {
        this._persistUser();
        return res;
      }).catch(err => {
        this._persistUser();
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
