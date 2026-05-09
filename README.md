# إنصاف (ENSAF) — Adaptive Learning Platform

**ENSAF** (إنصاف meaning "fairness/equity" in Arabic) is an accessible e-learning platform designed for students with motor disabilities. Using only a standard webcam, it tracks head/eye movements to control the cursor, enabling hands-free interaction with educational content.

## ✨ Features

- **🎯 Head Tracking Control** — Move your head to point the cursor, dwell to select
- **🧠 Smart Hint System** — Automatic hints when you hesitate too long
- **📊 Session Reports** — Detailed performance analytics after each quiz
- **🔊 Voice Feedback** — Arabic text-to-speech for all questions and results
- **⚡ No Calibration** — Works immediately after granting camera permission
- **🖱️ Mouse Fallback** — Traditional mouse control for compatibility
- **🚨 Emergency SOS** — 3-second hold button returns to home screen
- **📚 6 Subjects** — Math, Science, History, Geography, Literature, Biology
- **📖 Lesson Content** — Educational material before each quiz

## 🎮 How It Works

1. **Head Tracking**: Your nose tip relative to face center determines cursor position
2. **Dwell Selection**: Hold cursor over an element for 3.5 seconds (adjustable)
3. **Adaptive Difficulty**: Questions shuffle randomly each session
4. **Learning Flow**: Choose subject → Read lesson → Take quiz → View results

## 🚀 Live Demo

[Click here to try ENSAF live](https://ama1Mh.github.io/ensaf-head-tracker/)

## 🖥️ Installation

### Local Development

````bash
# Clone the repository
git clone https://github.com/ama1Mh/ensaf-head-tracker.git
cd ensaf-head-tracker

# Serve locally (any static server works)
python3 -m http.server 8000
# or
npx serve .

# Open http://localhost:8000



GitHub Pages Deployment
Fork this repository

Go to Settings → Pages

Set source to main branch / (root)

Your site will be live at https://ama1Mh.github.io/ensaf-head-tracker

📱 Browser Support
Browser	Head Tracking	Voice	Minimum Version
Chrome	✅ Full	✅	90+
Edge	✅ Full	✅	90+
Firefox	⚠️ Partial	✅	100+
Safari	⚠️ Requires	✅	14.1+ (needs HTTPS)
Note: Head tracking requires HTTPS (or localhost) and camera permissions.

🎯 Usage Guide
Setup
Click "السماح بالكاميرا" (Allow Camera)

Position yourself 50-70cm from screen

Ensure good lighting on your face

Navigation
Select option: Point head at button, hold still for 3.5s

Adjust dwell time: Use + and - buttons in top bar

Emergency: Click and hold red SOS button for 3 seconds

Voice: Toggle with 🔊 button (automatic during quizzes)

Subjects Available
Subject	Questions	Lesson Content
🔢 Mathematics	5	Multiplication tables, prime numbers
🔬 Science	5	Solar system, chemistry, human body
🏛️ History	5	World history, key events
🌍 Geography	5	Rivers, capitals, mountains
📖 Literature	5	Arabic literature classics
🧬 Biology	5	Cell theory, genetics, human anatomy
🏗️ Technical Architecture
text
┌─────────────────────────────────────────────────────┐
│                    ENSAF Platform                    │
├─────────────────────────────────────────────────────┤
│  Frontend Layer                                      │
│  ├── HTML5/CSS3 (RTL + Responsive)                  │
│  ├── Vanilla JavaScript (No frameworks)              │
│  └── Canvas/SVG animations                           │
├─────────────────────────────────────────────────────┤
│  MediaPipe Integration                               │
│  ├── Face Mesh Detection (468 landmarks)             │
│  ├── Nose tip + face center calculation              │
│  └── Real-time pose estimation (30fps)               │
├─────────────────────────────────────────────────────┤
│  Interaction Engine                                  │
│  ├── Smoothing filter (exponential moving avg)       │
│  ├── Dwell timer per element                         │
│  ├── Progress visualization (SVG/CSS)                │
│  └── Confidence-based status indicators              │
├─────────────────────────────────────────────────────┤
│  Accessibility Features                              │
│  ├── Web Speech API (Arabic TTS)                     │
│  ├── High contrast color scheme                      │
│  ├── Large touch/click targets                       │
│  └── Mouse fallback mode                             │
└─────────────────────────────────────────────────────┘
Key Algorithms
Head Pose Estimation (No ML training required):

javascript
// Extract face bounding box from landmarks
faceCX = (leftCheek.x + rightCheek.x) / 2
faceCY = (forehead.y + chin.y) / 2

// Nose offset relative to face center
offsetX = (nose.x - faceCX) / faceWidth
offsetY = (nose.y - faceCY) / faceHeight

// Map to screen coordinates [0,1]
cursorX = 0.5 + (-offsetX) * sensitivityX
cursorY = 0.5 + (offsetY) * sensitivityY
Dwell Selection:

Each interactive element maintains independent timer

Progress shown via stroke-dashoffset or width animation

Configurable threshold (default: 3500ms)

🔧 Configuration
Edit window.ST (State) in the script:

javascript
// Dwell time in milliseconds (1000-8000)
ST.dwellMs = 3500

// Sensitivity (higher = less head movement needed)
// In HeadTracker.setSens(x, y)
// Default: x: 2.8, y: 2.5

// Smoothing alpha (0-1, lower = smoother but laggier)
// In HeadTracker.setAlpha(a)
// Default: 0.10
📊 Performance Metrics
The platform tracks:

Accuracy: Correct answers / total questions

Response time: Average time per question

Hesitations: Number of hints triggered

Interaction method: Head tracking vs mouse

🛡️ Privacy & Security
✅ 100% local processing — No video frames leave your device

✅ No data storage — Everything destroyed on page close

✅ No tracking — No analytics, cookies, or external requests (except CDNs)

✅ HTTPS required — Browser security standard for camera access

🤝 Contributing
We welcome contributions! Areas for improvement:

Add more subjects and questions

Implement gaze estimation (iris tracking)

Add multiplayer/leaderboard features

Support for additional languages

Save session history to localStorage

Add accessibility shortcuts

Development Guidelines
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request

Code Style
Vanilla JavaScript (no frameworks for accessibility)

RTL-first CSS with CSS variables

Arabic/English bilingual comments

Event-driven architecture

📝 License
Distributed under the MIT License. See LICENSE for more information.

🙏 Acknowledgments
MediaPipe by Google for face mesh detection

IBM Plex Sans Arabic and Syne fonts

The open-source accessibility community

📧 Contact
Project Link: https://github.com/ama1Mh/ensaf-head-tracker

Made with ❤️ for accessibility and inclusive education

text

## **LICENSE** (MIT)

```text
MIT License

Copyright (c) 2024 ENSAF Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````
