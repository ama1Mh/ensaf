// Firebase initializer (module) - sets up Firebase and exposes simple auth helpers
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as fbSignOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

(function() {
  if (!window.CONFIG || !window.CONFIG.FIREBASE || !window.CONFIG.FIREBASE.enabled) {
    window.FirebaseAuthApi = null;
    return;
  }

  const cfg = window.CONFIG.FIREBASE.config || {};
  try {
    const app = initializeApp(cfg);
    const analytics = (typeof getAnalytics === 'function') ? getAnalytics(app) : null;
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    window.FirebaseAuthApi = {
      async signIn(email, password) {
        console.log('[Firebase] signIn', email);
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          return { success: true, user: cred.user };
        } catch (e) {
          console.warn('[Firebase] signIn error', e);
          return { success: false, message: e.message || String(e) };
        }
      },

      async signUp(name, email, password) {
        console.log('[Firebase] signUp', email, 'name:', name);
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (name && cred.user && typeof updateProfile === 'function') {
            await updateProfile(cred.user, { displayName: name });
          }
          return { success: true, user: cred.user };
        } catch (e) {
          console.warn('[Firebase] signUp error', e);
          return { success: false, message: e.message || String(e) };
        }
      },

      async sendPasswordReset(email) {
        console.log('[Firebase] sendPasswordReset', email);
        try {
          await sendPasswordResetEmail(auth, email);
          return { success: true };
        } catch (e) {
          console.warn('[Firebase] sendPasswordReset error', e);
          return { success: false, message: e.message || String(e) };
        }
      },

      async signOut() {
        console.log('[Firebase] signOut');
        try {
          await fbSignOut(auth);
          return { success: true };
        } catch (e) {
          console.warn('[Firebase] signOut error', e);
          return { success: false, message: e.message || String(e) };
        }
      },

      onAuthStateChanged(cb) {
        return onAuthStateChanged(auth, (user) => cb(user));
      }
      ,

      async getUserProfile(uid) {
        console.log('[Firebase] getUserProfile', uid);
        try {
          const ref = doc(firestore, 'users', uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            console.log('[Firebase] getUserProfile: no document found for uid', uid);
            return null;
          }
          return snap.data();
        } catch (e) {
          console.warn('[Firebase] getUserProfile error', e);
          return null;
        }
      },

      async saveUserProfile(uid, data) {
        console.log('[Firebase] saveUserProfile', uid, data);
        try {
          const ref = doc(firestore, 'users', uid);
          await setDoc(ref, data, { merge: true });
          return { success: true };
        } catch (e) {
          console.warn('[Firebase] saveUserProfile error', e);
          return { success: false, message: e.message || String(e) };
        }
      }
    };

    console.log('[Firebase] initialized');
  } catch (err) {
    console.error('[Firebase] init error', err);
    window.FirebaseAuthApi = null;
  }
})();
