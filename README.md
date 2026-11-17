# إنصاف (ENSAF) — Hands-free Adaptive Learning

**ENSAF** (إنصاف, "fairness / equity") is a browser-based, hands-free learning and
assessment platform for students with motor disabilities. Students steer a cursor with
**head movement**, **eye (iris) movement** or a **mouse**, and select by **dwelling**
(holding still) on a target. An Arabic voice reads questions, feedback and results. The
interface is available in **Arabic (RTL), English and Chinese**.

**Live site:** https://ama1mh.github.io/ensaf/

## Features

- **Three input modes** — head tracking, eye tracking (MediaPipe Face Mesh, in the
  browser) and mouse. Keyboard and touch also work everywhere.
- **Dwell selection on every control** — adjustable dwell time (1–8 s), a progress ring on
  the cursor and a fill bar on the target, leaving cancels, a short cooldown and a
  "move away first" rule prevent double selections.
- **Smooth, steady cursor** — One Euro filter plus a small dead zone, adjustable cursor
  speed and steadiness, optional 15-second calibration, one-tap re-centre.
- **Hint after hesitation** — a spoken and visual hint after 6 s without an answer.
- **SOS button** — hold for 3 s (or press) to call for help; pauses the quiz.
- **Session report** — score, time, hints and input mode after each quiz.
- **Voice** — follows the interface language, picks the best installed voice, never
  overlaps, can be muted, speech rate adjustable. Optional feedback sounds.
- **Accessible design** — WCAG 2.2 AA colours, light / dark / high-contrast themes,
  text-size setting, large targets (≥ 64 px for answers and main buttons), reduced-motion
  support, screen-reader labels, colour is never the only signal.
- **Accounts or guest** — sign in to keep settings across devices, or continue as a guest.
- **Lessons + quizzes** — 6 subjects (Mathematics, Science, History, Geography,
  Literature, Biology) in three languages.

## Run locally

```bash
git clone https://github.com/ama1Mh/ensaf.git
cd ensaf
npm install          # only needed for the tests / local server
npm start            # http://localhost:8000
# or, without Node:  python -m http.server 8000
```

The camera needs `https://` or `http://localhost`.

## Tests

```bash
npm test             # unit tests + Playwright end-to-end + axe accessibility checks
npm run test:unit    # pure logic (filter, dwell, hesitation, report, i18n, settings, voice)
npm run test:e2e     # Playwright (Chromium with a fake camera), laptop + tablet sizes
npm run bench        # reproducible before/after accuracy benchmark (simulated input)
npx playwright install chromium   # first time only
```

Tracking accuracy with a real webcam: open **Settings → Tracking accuracy test**
(`screens/accuracy-test.html`). It measures hit rate, time to select and false
selections for each input mode, with the new or the old smoothing filter.

## Project structure

```
index.html              app shell: top bar, dialogs (settings, SOS), script order
screens/*.html          screen fragments (welcome, login, mode choice, subjects, lesson,
                        question, result, profile) + accuracy-test.html (standalone)
css/tokens.css          all colours (light / dark / high-contrast) — the only place
css/main.css            layout and components
js/config.js            app configuration (Firebase web config, quiz timings)
js/i18n/translations.js all interface text in ar / en / zh
js/core/                pure logic: i18n, settings, One Euro filter, dwell core,
                        hesitation timer, report, router, state, events, pointer simulator
js/interaction/dwell.js dwell controller for every interactive element
js/tracking/face-tracker.js  head / eye tracking (MediaPipe loaded on demand)
js/features/            question database, voice, sounds
js/shared/              auth (Firebase Auth + Firestore profile), Firebase init, utils
js/app.js               screens, flow and wiring
tests/                  unit (node:test), e2e (Playwright + axe), bench
```

## Privacy

- **Camera video never leaves the device.** Frames are processed by MediaPipe inside the
  browser; no image, landmark or tracking data is uploaded. (MediaPipe's model files are
  downloaded from the jsDelivr CDN when head or eye mode starts.)
- **Stored in Firebase (signed-in users only):** the login (Firebase Authentication:
  name, email) and the user's settings (input mode, theme, language, dwell time, text
  size, voice options) in Firestore `users/{uid}`.
- **Not stored anywhere:** video, quiz answers or scores, and **no analytics** or
  tracking of any kind. Guests' settings stay in the browser's local storage.

See `FIREBASE_TODO.md` for the Firestore security rules that keep each user's document
private.

## Browser support

Chrome / Edge 90+ (recommended, best voices), Firefox 100+ and Safari 15+ (camera needs
HTTPS). Arabic and Chinese voices depend on the voices installed in the operating system.

## Contributing

Work on a feature branch and open a pull request. Keep all text in
`js/i18n/translations.js` (all three languages), all colours in `css/tokens.css`, and run
`npm test` before pushing.

---

Made with care for accessible and inclusive education.
