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
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          return { success: true, user: cred.user };
        } catch (e) {
          return { success: false, message: e.message || String(e) };
        }
      },

      async signUp(name, email, password) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (name && cred.user && typeof updateProfile === 'function') {
            await updateProfile(cred.user, { displayName: name });
          }
          return { success: true, user: cred.user };
        } catch (e) {
          return { success: false, message: e.message || String(e) };
        }
      },

      async sendPasswordReset(email) {
        try {
          await sendPasswordResetEmail(auth, email);
          return { success: true };
        } catch (e) {
          return { success: false, message: e.message || String(e) };
        }
      },

      async signOut() {
        try {
          await fbSignOut(auth);
          return { success: true };
        } catch (e) {
          return { success: false, message: e.message || String(e) };
        }
      },

      onAuthStateChanged(cb) {
        return onAuthStateChanged(auth, (user) => cb(user));
      }
      ,

      async getUserProfile(uid) {
        try {
          const ref = doc(firestore, 'users', uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) return null;
          return snap.data();
        } catch (e) {
          return null;
        }
      },

      async saveUserProfile(uid, data) {
        try {
          const ref = doc(firestore, 'users', uid);
          await setDoc(ref, data, { merge: true });
          return { success: true };
        } catch (e) {
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
