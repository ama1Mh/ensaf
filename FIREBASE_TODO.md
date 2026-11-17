# Firebase — things only you can do (console / credentials)

No Firebase setting was changed from code: the web config in `js/config.js` (API key,
project id `ensaf-134dc`, etc.) is untouched, nothing was deployed, and no new cloud
service was created. The steps below need the Firebase / Google Cloud console.

Project: **ensaf-134dc** — https://console.firebase.google.com/project/ensaf-134dc

---

## 1. Firestore security rules — each user can only read/write their own document

The app reads and writes only `users/{uid}` (name, email, preferences). Quiz answers and
scores are **not** stored. (`js/shared/firebase-init.js` still contains an unused
`saveQuizResult` helper for `users/{uid}/results`; the rules below also cover it in case
it is ever used.)

1. Open **Build → Firestore Database → Rules**.
2. Replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // A signed-in user can read and write only their own profile.
       match /users/{userId} {
         allow read, delete: if request.auth != null && request.auth.uid == userId;
         allow create, update: if request.auth != null
                               && request.auth.uid == userId
                               && request.resource.data.keys().hasOnly(
                                    ['name', 'email', 'preferences', 'createdAt', 'updatedAt'])
                               && (!('preferences' in request.resource.data)
                                   || request.resource.data.preferences is map);

         // Optional per-user sub-collections (e.g. results) — same owner rule.
         match /{sub=**} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }

       // Everything else is closed.
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
3. Click **Publish**.
4. Test it: **Rules → Rules Playground** → simulate a `get` on `/users/abc` with
   *Authenticated* and UID `abc` → **Allowed**; change the UID to `xyz` → **Denied**;
   unauthenticated → **Denied**.

## 2. Authorised domains for sign-in

1. **Build → Authentication → Settings → Authorized domains**.
2. Make sure these are listed (click **Add domain** for any that are missing):
   - `ama1mh.github.io` (the live site)
   - `localhost` (local testing — usually present by default)
3. Remove domains you do not use.

If this is missing, sign-in on the live site fails with `auth/unauthorized-domain`
(the app now shows: "This website is not yet allowed to sign in. You can continue as a
guest.").

## 3. Email/Password sign-in must be enabled

1. **Build → Authentication → Sign-in method**.
2. **Email/Password** → **Enable** (leave "Email link" off unless you want it) → **Save**.

If disabled, sign-in fails with `auth/operation-not-allowed` (the app shows "Email sign-in
is not switched on yet. You can continue as a guest.").

Recommended: **Authentication → Settings → User actions → Email enumeration protection**
→ keep **enabled** (the app already shows the same message for "wrong password" and
"no such user").

## 4. Restrict the API key to your domains

The Firebase web API key is public by design, but it should only work from your sites.

1. Open https://console.cloud.google.com/apis/credentials?project=ensaf-134dc
2. Click the key named **Browser key (auto created by Firebase)** (its value starts with
   `AIzaSyBD_Mby…`, the same as in `js/config.js`).
3. **Application restrictions** → **Websites** → add:
   - `https://ama1mh.github.io/*`
   - `http://localhost:8000/*` (local testing; also add other ports you use)
   - `http://localhost/*`
4. **API restrictions** → **Restrict key** → select only:
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
   - Firebase Installations API
5. **Save**. Changes can take a few minutes; then test sign-in on the live site.

## 5. Turn off Google Analytics for the project

The app no longer loads Google Analytics (it was removed from `firebase-init.js`), but the
Firebase project still has Analytics linked and `js/config.js` still contains a
`measurementId`. To stop it fully:

1. **Project settings (gear) → Integrations → Google Analytics → Manage → Unlink**
   (or, if you prefer to keep the link, nothing is sent by the app any more).
2. Optionally delete the `measurementId` line from `js/config.js` afterwards (it is unused).
   I did not edit the Firebase config myself, as instructed.

## 6. Password-reset email in Arabic / Chinese (optional)

**Authentication → Templates → Password reset** → set the template language (or use
`auth.languageCode` later). By default the reset email is in English.

## 7. Errors found that need console access

- **Unknown until checked:** whether `ama1mh.github.io` is in Authorized domains and
  whether Email/Password is enabled — the code now shows a friendly message for both
  cases, but only the console can fix them.
- **Firestore rules:** if the current rules are still the default "test mode" rules
  (open to everyone until a date) or "locked mode", either everyone can read all
  profiles (privacy risk) or saving preferences fails with `permission-denied`
  (the app keeps settings on the device and shows "Not allowed to save your data to the
  cloud"). Section 1 fixes both.
- **Account deletion:** there is no in-app "delete my account" yet. Until there is,
  delete accounts on request in **Authentication → Users** and the matching
  `users/{uid}` document in Firestore.
