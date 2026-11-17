# ENSAF — Accessibility pass: what changed and why

Branch: **`improve/accessibility-pass`** (from `main` @ `d1bd458`; `main` was not touched).
The uncommitted auth / router / Firebase work that was in the working tree was committed
first as a baseline (`e4ebf80`) and then finished. The plan is in `IMPROVEMENT_PLAN.md`.

Guiding question for every change: *does this make ENSAF easier, safer and more
dignified for a student who cannot use a mouse or keyboard?*

---

## 1. Fixes that unblocked students (highest impact)

| Problem found | Fix |
|---|---|
| With the in-progress router change **no screen appeared at all** (the router waited for `ROUTER.start()`, which nothing called). | App now starts the router once auth is known, or after 2.5 s, so offline / blocked Firebase never blocks the app. |
| **Guest mode was switched off** (`requireAuth: true`). A student who cannot type could not get in. | `requireAuth: false` (app behaviour, not Firebase project config). "Continue as guest" is now the **first** button on the login screen. |
| **Dwell worked only on some buttons, and not at all in mouse mode.** Top bar, login, settings, profile and SOS were not hands-free. | One `DwellController` (`js/interaction/dwell.js`) gives dwell to **every** interactive element, in every mode. |
| A resting mouse sends no events, so dwell could never finish in mouse mode. | The last position is re-fed ~30×/s. |
| **The SOS button did not exist in the page** (only referenced in code). | Large SOS button (96 px, text + icon), 3-second dwell or press, opens a help dialog that announces "The student needs help", pauses the quiz and hint, plays a short (non-looping) tone. |
| **Double selections** and auto-selection of a button that appears under a resting cursor on the next screen. | Cooldown (0.9 s) + "move away first" re-arm rule + answer lock. Real clicks also disarm dwell. |
| Camera failure used `alert()`, which a hands-free student cannot close; the camera was also opened twice. | Spoken + visual messages (toast with buttons), graceful fallback to mouse; one camera stream. |
| Result buttons were English-only and found by matching Arabic text, so they had no dwell in English/Chinese. | Proper translated buttons with `data-ra` actions. |
| Hint text could be an untranslated object; questions did not change language mid-quiz. | Questions are kept unlocalised and rendered in the current language; switching language re-renders the current question, lesson, subjects or report. |

## 2. Visual design and WCAG 2.2 AA

- **One token file, `css/tokens.css`**: every colour is a CSS variable, in three themes:
  **light** (default), **dark**, **high contrast** (black / white / yellow / cyan).
  The ENSAF identity is kept: violet → sky gradient buttons, amber accent in the logo,
  rounded glassy cards, Syne headings, IBM Plex Sans Arabic text.
- Contrast checked numerically for every text / UI token. Text ratios (on surface):
  light 7.1–17.4:1, dark 8.3–15.6:1, high contrast 8.6–21:1. Borders of controls ≥ 4.3:1.
  White text on the gradient buttons is ≥ 5.9:1, and on the SOS button 6.5:1.
- **Never colour alone**: correct = green, solid 4 px border, ✓ and "Correct" /
  "Correct answer" label; wrong = red, **dashed** border, ✗ and "Your answer" label. The
  result shows "✓ Passed" / "! Needs review". The status dot also has text.
- **Targets**: answers 96 px tall, main buttons and mode cards ≥ 64 px, every control
  ≥ 44–48 px (the old dwell −/+ buttons were 18 px). 16–24 px gaps between dwell targets.
- **States**: one consistent hover style, a two-tone focus ring (amber / yellow, 3 px +
  halo) and a dwell state (thick outline + fill bar on the element + progress ring on
  the cursor). Leaving cancels.
- **Motion**: `prefers-reduced-motion` turns off particles, the scrolling band,
  floating cards and pulses. Nothing flashes.
- **Text**: quiz body ≥ 18 px (answers 19–22 px, question 22–30 px), lesson 19 px, a
  **text-size setting** (90–160 %), correct RTL/LTR per language (Chinese uses a Chinese
  system font).
- **Semantics**: skip link, `header` / `main` landmarks, one `h1` per screen with focus
  moved to it on navigation, real `<button>`s for subject cards and answers (were
  `div`s), tablist for login / register, `role="progressbar"`, live regions for status,
  hints and feedback, native `<dialog>` for settings and SOS (focus trapped, Escape
  closes), labelled inputs with `aria-invalid` + `aria-describedby` errors.
- **Keyboard** is a full alternative: Tab order follows the layout, Enter / Space
  activate, arrow keys move between login tabs, keys 1–4 answer questions.
- **Icons**: the Material Symbols ligature text (e.g. "volume_up") is never shown — icons
  stay invisible until the font loads, are removed if it fails, and are always
  `aria-hidden`. Icon-only top-bar buttons then show their text labels.
- The landing page keeps its layout; its hard-coded colours were moved to tokens, small
  10–13 px texts raised to ≥ 14 px, icons no longer erased by translation, FAQ accordion
  and contact form now work (scripts inside fetched fragments never ran).

## 3. Login and registration

- Large fields (60 px), labels, show / hide password (button with `aria-pressed`, text +
  icon), loading state on the button (spinner, `aria-busy`, disabled), **no double
  submits**, 15 s timeout so a blocked network cannot hang the screen.
- Per-field validation and friendly, **translated** Firebase errors in ar / en / zh:
  wrong email or password, email already used, weak password, invalid email, too many
  attempts, network error, account disabled, sign-in not enabled, unauthorised domain,
  configuration error, permission denied, offline, unknown. Errors are also spoken.
- Firebase blocked or offline: the login screen says so and points to guest mode.
  (`firebase-init.js` failing to load is now detected immediately instead of after 15 s.)
- After sign-in the student's saved settings are applied; settings changes are saved to
  their profile (debounced). Calibration stays on the device.

## 4. Tracking pipeline

- **`js/tracking/face-tracker.js`** replaces `head-tracker.js` + `eye-tracker.js`.
- **One Euro filter + 5 px dead zone** (`js/core/filters.js`) instead of a fixed EMA:
  steady when still, little lag when moving. Defaults tuned with the benchmark below.
- **Settings**: cursor speed (sensitivity 50–200 %), cursor steadiness, dwell time,
  dwell in mouse mode on/off. **Optional 5-point quick calibration** (≈15 s); ENSAF works
  without it. **Re-centre** button uses the current head pose as the screen centre.
- **Robustness**: face lost > 1.2 s → spoken + visual message with "Switch to mouse";
  dwell never fires while the face is lost; low light detected from the video brightness;
  camera denied / missing / busy and MediaPipe not loading → clear message and mouse
  mode. Blinks no longer move the eye cursor (eye-aspect-ratio hold). The old
  "iris → nose" fallback never triggered (iris landmarks always exist) and jumped to an
  absolute nose position; it now falls back to the head-pose mapping when the eyes are
  too small to measure.
- **Performance**: MediaPipe is loaded only when head/eye mode starts (never in mouse
  mode; duplicate `<script>` tags removed; script and model versions pinned to the same
  release). Frames are processed only when the previous one is finished, at ≤ 24 fps,
  adapting down to 15 fps on slow laptops, and paused when the tab is hidden. The tracker
  and camera are stopped when switching mode or signing out (no leaks).
- If the camera was allowed before, tracking restarts automatically on page load so the
  student can sign in hands-free.

## 5. Voice, sound and language

- Voice follows the interface language (ar-SA / en-US / zh-CN), picks the best installed
  voice (exact locale, then same language, natural/neural/online voices preferred) and
  tells the user once if no voice for that language is installed.
- Speech never overlaps (each utterance cancels the previous one). Mute button in the top
  bar, speech-rate setting. The question **and its options** are read aloud.
- Consistent feedback on every selection: visual state + short tick sound; correct /
  wrong: colour + icon + label + voice + tone; hint: card + voice + chime; result:
  voice summary. Sounds are optional (Settings) and made with Web Audio (no files).
- All visible strings are in `js/i18n/translations.js` (355 keys × 3 languages; tests
  check that every key exists in all languages and every key used in HTML/JS exists).
  Language and all settings persist (localStorage, and the profile for signed-in users).
- Arabic "next / previous" arrows now point the right way in RTL.

## 6. Code quality and cleanup

- `app.js` rewritten without the duplicated `renderUserState` / `setupAuthForms` /
  `handleLogin` / … methods and debug logs; translations moved out of it.
- Pure, unit-tested modules in `js/core/`: `filters`, `dwell-core`, `hesitation`,
  `report`, `i18n`, `settings`, `pointer-sim`.
- **Google Analytics removed** (`getAnalytics` import in `firebase-init.js`). No other
  analytics or tracking exist.
- Deleted unused files (none were loaded or user-facing): `js/shared/{voice,dwell,database,dom}.js`
  (old duplicates), `js/interaction/{cursor,sos}.js` (never wired to the DOM),
  `js/features/{quiz,lessons}.js` (loaded but never used by the app),
  `js/tracking/{base,head,eye}-tracker.js` (replaced by `face-tracker.js`),
  `css/{head,eye}-tracking.css` (never linked).
- Router: a navigation requested during the 50 ms transition is queued instead of lost;
  routes are guarded (no quiz without a session, profile only for accounts).
- README: correct repository links, live URL https://ama1mh.github.io/ensaf/, corrected
  privacy section (login + settings in Firebase; no video, no answers, no analytics).
- `package.json`: name/links fixed; `npm test`, `test:unit`, `test:e2e`, `test:a11y`,
  `bench`, `start` scripts.

## 7. Accuracy — before / after

### Simulated input (reproducible: `npm run bench`)

There is no webcam in the environment where this work was done, so a pointer simulator
(`js/core/pointer-sim.js`) feeds the **old** pipeline (EMA α = 0.10 + original dwell: 30 px
padded first-match hit test, no cooldown) and the **new** pipeline (One Euro + dead zone +
sticky target, 150 ms grace, cooldown, re-arm) with the same noisy head-tracking signal
(white sensor noise, 4 Hz tremor, occasional tracking glitches, imperfect aiming).
Dwell time 2.0 s, 5 seeds × 40 trials per row.

| Scenario | Pipeline | Hit rate | False selections | Timeouts | Mean time to select |
|---|---|---|---|---|---|
| Large targets 180×110 px, typical noise | Before (EMA + old dwell) | 100.0% | 0 / 200 | 0 | 3.21 s |
| Large targets 180×110 px, typical noise | After (One Euro + new dwell) | 100.0% | 0 / 200 | 0 | 3.06 s |
| Small targets 120×80 px, strong tremor | Before (EMA + old dwell) | 90.0% | 20 / 200 | 19 | 3.36 s |
| Small targets 120×80 px, strong tremor | After (One Euro + new dwell) | **99.5%** | **1 / 200** | **1** | 3.16 s |

| Pipeline | Rest jitter (RMS px) | Frames where the cursor moves while holding still | Lag to 90 % of a 400 px move |
|---|---|---|---|
| Before | 5.64 | 99.7% | 900 ms |
| After | 7.44 | **18%** | **367 ms** |

Reading: with large targets both pipelines are accurate; the new one is ~0.15 s faster per
selection. With small targets and strong tremor (the students ENSAF is for) false
selections drop from 20 to 1 and timeouts from 19 to 1. The old EMA has slightly lower RMS
jitter but trails the head by almost a second and never stops moving; the new cursor
stands perfectly still 82 % of the time while held still and follows 2.5× faster.
"Cursor steadiness" in Settings trades a little speed for more stillness.

### Real input

`screens/accuracy-test.html` (Settings → *Tracking accuracy test*) runs the same test with
**mouse, head or eye** input and lets you choose the **new or old** filter, so before/after
can be compared with a real webcam. Results stay in the browser and can be downloaded as
JSON. Automated run here (mouse mode, new pipeline, 1.0 s dwell, 4 trials): **100 % hits,
0 false selections, mean 1.93 s**. Head/eye numbers need a real face — see section 9.

## 8. Test and accessibility results

Commands: `npm test` (= `npm run test:unit` + `npm run test:e2e`).

- **Unit tests** (`node:test`, 42 tests): One Euro filter and dead zone, dwell core
  (selection, leave-cancels, grace period, cooldown, re-arm, no double selection, stuck
  re-arm regression), hesitation timer (6 s, stop, pause/resume), report calculation
  (percent, grade boundaries, average time, bad input), i18n (lookup, fallbacks, RTL,
  voice language, every key in 3 languages, placeholders match, every key used in HTML/JS
  exists), settings sanitising/migration, voice selection. **42 / 42 pass.**
- **Playwright end-to-end** (Chromium, `--use-fake-ui-for-media-stream
  --use-fake-device-for-media-stream`, mock Firebase so no real accounts are created),
  run at **laptop 1366×768** and **tablet 820×1180**:
  every screen loads with **no console errors or warnings**; no horizontal scrolling;
  target sizes; login / registration / guest / reset / sign-out with all error messages
  (in ar, en, zh); loading state and no double submit; show/hide password; offline and
  blocked-Firebase handling; a **full quiz in mouse mode using only dwell** (dwell progress
  visible, leaving cancels, hint after 6 s spoken and shown, feedback with ✓/✗, no second
  answer, session report, retry); SOS by 3 s dwell (hint paused, dialog-only dwell),
  SOS keyboard / home; keyboard answering; dwell time from the top bar; switching
  **ar → en → zh** (text, `dir`, voice language of the next utterance, persistence after
  reload, mid-question re-render, no Arabic left in the English UI); **light / dark /
  high-contrast** themes (persisted); text size; mute; reduced motion; icon-font failure;
  camera denied / missing; MediaPipe blocked (camera released); MediaPipe not loaded in
  mouse mode; and (with internet, `ENSAF_NETWORK=1`) the **real MediaPipe** model with the
  fake camera: tracker starts, "I can't see your face" is shown, switching to mouse
  releases the camera.
- **axe-core** (WCAG 2.0 / 2.1 / 2.2 A + AA) on every screen and dialog — welcome, login
  (with errors), register, mode choice, subjects, lesson, question (plain, with hint,
  with feedback), result, settings, SOS, profile, accuracy test, English and Chinese —
  in **all three themes**: **0 serious, 0 critical** violations.
- Final run: see the summary at the end of this file.

Known console output outside our control: when head/eye tracking runs, MediaPipe's own
WebAssembly/WebGL code logs informational "warnings" (e.g. "Successfully created a WebGL
context", "GPU stall due to ReadPixels"). They come from the library, not from ENSAF.

## 9. Please check by hand with a real webcam

1. **Head mode**: turn your head left/right/up/down — the cursor should move the same
   way (not mirrored), reach all four screen edges at 100 % speed, and stand still when you
   do. Try "Cursor speed" and "Cursor steadiness" in Settings.
2. **Eye mode**: the iris → screen direction kept the original sign convention (tuned by
   the team on real data). Check left/right and up/down are not inverted; check that
   blinking does not move the cursor; run the quick calibration and confirm it helps.
3. **Re-centre** (top bar, head/eye mode): look at the centre, press it, the cursor should
   centre after ~1.5 s.
4. **Face lost**: cover the camera or leave the chair → message + voice within ~1–2 s,
   no selections while away; come back → "Tracking active".
5. **Low light**: dim the room → "The light is low" message.
6. **Accuracy test page** with head and eye mode, **new vs old filter**, 12+ trials each,
   and record the numbers (Download JSON) — this is the real before/after for the Ministry.
7. **Voices** on the presentation laptop: check that Arabic, English and Chinese voices are
   installed (Windows: Settings → Time & language → Speech → Add voices). If one is
   missing, ENSAF says so once and uses the closest voice.
8. **Performance** on an ordinary school laptop: the cursor should feel smooth; the
   preview camera should switch off when changing to mouse mode.
9. **Sign-in on the live domain** after doing `FIREBASE_TODO.md` (authorised domain,
   rules, API-key restriction).

## 10. Decisions taken autonomously (and notes)

- **Mouse mode uses dwell by default** (Settings can turn it off) so the same hands-free
  behaviour can be demonstrated with a mouse, a trackball or a head mouse, as the old
  message "move the cursor to interact" suggested.
- The **mode chooser** (head / eye / mouse cards) is now on the camera-permission screen,
  because the old mode buttons no longer existed in the page.
- **Quiz answers and scores are not saved to Firebase** (the unused `saveQuizResult` helper
  is left in `firebase-init.js` but never called), matching the privacy statement.
- Fonts are still loaded from Google Fonts and the hero photo from Unsplash (both were
  already there; no new third-party services were added). MediaPipe model files still come
  from jsDelivr.
- **Content to review before the Ministry presentation** (not changed, because it is
  content, not code): the landing page shows marketing numbers ("2,400+ active learners",
  "97 % / 94 % tracking accuracy") and two testimonials that look like placeholders, and
  the contact form does not send messages anywhere (it now shows an inline "Thank you"
  instead of an alert). Consider replacing the numbers with measured accuracy-test results.
- Typing an email and password hands-free still needs an on-screen keyboard (e.g. the
  Windows on-screen keyboard). Guest mode is the fully hands-free path. A built-in dwell
  keyboard would be a good next step.
- Node.js LTS was installed on this machine (via winget) to run the tests.

---

## Final test run (2026-11-18)

- `npm run test:unit` — **42 passed, 0 failed**.
- `ENSAF_NETWORK=1 npx playwright test` (laptop 1366×768 + tablet 820×1180) — **100 passed,
  0 failed** (includes the axe-core checks in all three themes and the real MediaPipe run).
  Without internet the real-MediaPipe test is skipped (98 run, all pass).
