# ENSAF — Improvement Plan (accessibility pass)

Branch: `improve/accessibility-pass` (created from `main` @ `d1bd458`, carrying the
uncommitted auth / router / firebase-init work that was in the working tree).

## How the app fits together (as found)

```
index.html ── loads ─┬─ config.js (CONFIG)      ── state.js (STATE) ── events.js (EVENTS)
                     ├─ router.js (ROUTER)  hash routes  #/ , #/login , #/subjects …
                     ├─ screen-loader.js  fetches screens/*.html into #screens-root
                     ├─ auth.js (AuthManager) ⇄ firebase-init.js (ES module → window.FirebaseAuthApi)
                     ├─ features/database.js (DB: subjects, questions, lessons in ar/en/zh)
                     ├─ features/voice.js (VoiceManager, Web Speech)
                     ├─ tracking/head-tracker.js, eye-tracker.js (MediaPipe Face Mesh)
                     ├─ interaction/dwell.js (DwellSystem)
                     └─ app.js (EnsafApp: ~700 lines of translations + all UI logic)
```

Flow: welcome → (login | guest) → camera permission → subjects → lesson → quiz → result.

## Problems found — ordered by impact on students with motor disabilities

### P0 — blocks a student or breaks a core feature
1. **App never starts with the in-progress router change.** `router.js` now waits for
   `App` to call `ROUTER.start()`, but `app.js` never calls it, so no screen is shown.
2. **Guest mode is switched off** (`CONFIG.FIREBASE.requireAuth: true` hides the guest
   button and wipes guest sessions). A student who cannot type an email/password cannot
   get in at all.
3. **No dwell in mouse mode, no dwell on most controls.** Dwell only exists on subject
   cards, answers, lesson and result buttons. Top bar, login, permission, profile, SOS
   cannot be used hands-free. In mouse mode dwell is disabled entirely.
4. **SOS button does not exist in the DOM** (`#sos`, `#sosm` are referenced by code only).
5. **Hints show “[object Object]” risk / hint text** — hint objects are localised only
   via `DB.getQuestions`; questions are not re-localised when the language changes.
6. **Double selection & no cooldown.** Dwell can fire on the next screen immediately
   (the cursor is already resting where the new button appears); answers can be
   selected twice before the 2.2 s delay ends.
7. **Camera failure uses `alert()`** (blocks a hands-free user; needs a click to close)
   and camera is opened twice (app `getUserMedia` + MediaPipe `Camera`).
8. **Results buttons are English-only and detected by Arabic text**, so in English/Chinese
   the result actions never get dwell targets.

### P1 — accessibility (WCAG 2.2 AA)
9. Contrast failures: 10–11 px grey text in top bar, `--t3` on translucent cards,
   white text on `#9333ea88` floats, hint text 13 px, etc.
10. Tiny targets: dwell −/+ buttons 18×18 px, top-bar buttons ~28 px high, language select.
11. Correct/wrong shown by colour only (green/red border).
12. Only light + dark (“warm”) themes; no high-contrast; colours scattered as literals.
13. No `prefers-reduced-motion` support (particles, marquee band, floating cards, pulses).
14. Icon font failure shows raw ligature text (“volume_up”) and screen readers read it.
15. Subject cards and answers are `<div>`s — not keyboard operable, no roles/labels.
16. `data-i18n` overwrites `textContent` and deletes icons inside pills/eyebrows/FAQ.
17. Scripts inside fetched fragments never run (FAQ accordion, placeholder translation).
18. No text-size setting; quiz body text below 18 px.
19. Login: no show/hide password, raw Firebase error strings in English, no loading
    state, double submits possible, no per-field errors, tabs not a real tablist.

### P2 — tracking quality & robustness
20. EMA smoothing (α = 0.10) is laggy yet still jittery at rest; no dead zone.
21. No sensitivity/speed settings, no calibration; recalibrate does nothing for head mode.
22. Face lost / poor lighting / camera denied are not communicated (status text is
    hard-coded Arabic); no fallback offer.
23. Eye mode: “iris missing → nose” fallback never triggers (iris landmarks always exist
    with `refineLandmarks`), and the fallback jumps to an absolute nose position. Blinks
    move the cursor.
24. FaceMesh processes every frame with no throttle; trackers are never stopped
    (leaks when switching mode); MediaPipe script and `locateFile` versions mismatch;
    MediaPipe tags duplicated in `index.html` and load render-blocking even in mouse mode.

### P3 — voice, i18n, code quality
25. Voice: `onvoiceschanged` never attached (bug), no best-voice choice, no mute/rate
    UI, status messages hard-coded in Arabic.
26. Many hard-coded strings (top bar, result screen, SOS, status, theme titles).
27. Google Analytics loaded from `firebase-init.js`.
28. `app.js` has duplicated methods (`renderUserState`, `setupAuthForms`, `handleLogin`…
    defined two or three times), debug `console.log`s, dead modules
    (`js/shared/{voice,dwell,database}.js`, `js/interaction/{cursor,sos}.js`,
    `js/features/{quiz,lessons}.js`, `css/{head,eye}-tracking.css`).
29. README links point to the old `ensaf-head-tracker` repo; privacy section is wrong.
30. No tests.

## Execution plan

1. **Foundations** – commit baseline; pure, unit-testable modules in `js/core/`:
   `filters.js` (One Euro + dead zone), `dwell-core.js` (dwell timer with cooldown and
   re-arm), `hesitation.js`, `report.js`, `i18n.js` (+ translations moved out of app.js).
2. **Design system** – one token file (`css/tokens.css`) with light / dark /
   high-contrast themes, contrast-checked; restyle top bar, screens, landing page with
   tokens; 64 px targets; focus/hover/dwell states; reduced motion; text-size scale;
   icon-font fallback.
3. **Interaction** – one global dwell controller for every interactive element
   (all modes incl. mouse), visible ring on the cursor + fill on the element, leave =
   cancel, cooldown, re-arm, keyboard parity; SOS button + dialog; settings dialog.
4. **App rewrite** – de-duplicate `app.js`, wire router guard + auth, mode chooser on
   the permission screen, consistent feedback (visual + voice + optional sound),
   translated results, language switch re-localises current content.
5. **Login/registration** – large fields, tablist, show/hide password, per-field errors,
   translated Firebase errors, loading + double-submit guard, offline/blocked Firebase
   handling, prominent guest button.
6. **Tracking** – single `FaceTracker` (head / eye), own camera loop using the stream we
   already opened, throttled processing, One Euro filter + dead zone, sensitivity,
   optional 5-point calibration, neutral-pose recentre, blink hold, face-lost and
   low-light messages, MediaPipe lazy-loaded with fallback to mouse; proper teardown.
7. **Voice** – best voice per language with fallbacks, no overlap, mute & rate.
8. **Accuracy test page** – `screens/accuracy-test.html` (+ simulated-input benchmark
   to compare legacy EMA vs new filter reproducibly).
9. **Tests** – Playwright e2e (fake camera), axe-core on every screen, `node:test`
   unit tests; `npm test`.
10. **Docs** – README, `CHANGES.md`, `FIREBASE_TODO.md`.
