// Firebase initializer (ES module).
// Sets up Firebase Auth + Firestore and exposes a small promise-based API on
// window.FirebaseAuthApi for the classic (non-module) scripts to use.
// Dispatches a `firebase-ready` event on window once the API is available
// (detail: { ok: boolean }).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

function announce(ok) {
  window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ok } }));
}

function fail(e) {
  return { success: false, code: e?.code || 'unknown', message: e?.message || String(e) };
}

(function () {
  const fbConfig = window.CONFIG && window.CONFIG.FIREBASE;
  if (!fbConfig || !fbConfig.enabled) {
    window.FirebaseAuthApi = null;
    announce(false);
    return;
  }

  let app, auth, db;
  try {
    app = initializeApp(fbConfig.config || {});
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error('[Firebase] init error', err);
    window.FirebaseAuthApi = null;
    announce(false);
    return;
  }

  // Keep the session across reloads (default for web, but be explicit).
  setPersistence(auth, browserLocalPersistence).catch(e =>
    console.warn('[Firebase] setPersistence failed', e)
  );

  // Analytics is optional and throws on localhost / blocked cookies / some
  // browsers — load it in isolation so it can never take auth down with it.
  if (fbConfig.analytics !== false && fbConfig.config?.measurementId) {
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js')
      .then(async ({ getAnalytics, isSupported }) => {
        if (await isSupported()) getAnalytics(app);
      })
      .catch(e => console.info('[Firebase] analytics unavailable', e?.message || e));
  }

  window.FirebaseAuthApi = {
    async signIn(email, password) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: cred.user };
      } catch (e) {
        return fail(e);
      }
    },

    async signUp(name, email, password) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          try { await updateProfile(cred.user, { displayName: name }); }
          catch (e) { console.warn('[Firebase] updateProfile failed', e); }
        }
        return { success: true, user: cred.user };
      } catch (e) {
        return fail(e);
      }
    },

    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (e) {
        return fail(e);
      }
    },

    async signOut() {
      try {
        await fbSignOut(auth);
        return { success: true };
      } catch (e) {
        return fail(e);
      }
    },

    onAuthStateChanged(cb) {
      return onAuthStateChanged(auth, user => cb(user));
    },

    currentUser() {
      return auth.currentUser;
    },

    // ── Firestore: users/{uid} ────────────────────────────────
    async getUserProfile(uid) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? snap.data() : null;
      } catch (e) {
        console.warn('[Firebase] getUserProfile error', e);
        return null;
      }
    },

    async saveUserProfile(uid, data, { isNew = false } = {}) {
      try {
        const payload = { ...data, updatedAt: serverTimestamp() };
        if (isNew) payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
        return { success: true };
      } catch (e) {
        console.warn('[Firebase] saveUserProfile error', e);
        return fail(e);
      }
    },

    // ── Firestore: users/{uid}/results/{autoId} ───────────────
    async saveQuizResult(uid, result) {
      try {
        const ref = await addDoc(collection(db, 'users', uid, 'results'), {
          ...result,
          createdAt: serverTimestamp()
        });
        return { success: true, id: ref.id };
      } catch (e) {
        console.warn('[Firebase] saveQuizResult error', e);
        return fail(e);
      }
    },

    async getQuizResults(uid, max = 20) {
      try {
        const q = query(collection(db, 'users', uid, 'results'), orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || null };
        });
      } catch (e) {
        console.warn('[Firebase] getQuizResults error', e);
        return [];
      }
    }
  };

  console.log('[Firebase] initialized');
  announce(true);
})();
