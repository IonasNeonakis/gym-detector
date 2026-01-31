Role: You are a senior frontend engineer experienced with PWA, camera APIs, and MediaPipe Pose.

Goal: Build a simple PWA web app that counts exercises (pushups and squats) using the phone camera and pose detection.

Tech Stack
Next.js (with Vite)
JavaScript (not TypeScript)
MediaPipe Pose (JavaScript version)
vite-plugin-pwa
Web Camera API (getUserMedia)

Functional Requirements

Display live camera feed on screen.

Run MediaPipe Pose on each frame to detect body landmarks.

Support two exercise modes:

Pushups

Squats

Provide a UI toggle (button or dropdown) to switch between exercise modes.

Pushup Detection Logic

Track shoulder, elbow, and wrist joints.

Calculate elbow angle.

States:

"down" when elbow angle < 90°

"up" when elbow angle > 160°

Count one rep when transitioning from "down" → "up".

Show feedback:

“Go lower” if user does not reach down threshold

“Good rep” when counted

Squat Detection Logic

Track hip, knee, and ankle joints.

Calculate knee angle.

States:

"down" when knee angle < 90°

"up" when knee angle > 160°

Count one rep when transitioning from "down" → "up".

Show feedback:

“Go lower” if user does not reach depth

“Good rep” when counted

UI Requirements

Fullscreen camera view

Rep counter overlay

Exercise mode selector (Pushups / Squats)

Simple text feedback

Mobile-first layout

PWA Requirements

Register service worker using vite-plugin-pwa

Offline shell support

App installable on mobile

Camera Usage

Use front camera by default.

Phone will be placed on the floor facing the user:

Side view for pushups

Front or side view for squats

Mirror video preview for front camera.

Constraints

No backend

No authentication

No styling framework

No analytics

No external APIs except MediaPipe

Keep code minimal and readable