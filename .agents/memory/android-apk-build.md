---
name: Windows Android APK build
description: Local Windows APK compilation for the Expo game after generating and versioning the Android project.
---

The Windows APK workflow uses the generated Android project committed under the mobile artifact, then runs the Gradle wrapper on the user's PC. The Replit container is suitable for generating and checking the project but does not include a JDK for running Gradle.

**Why:** GitHub Desktop only synchronizes the repository; Android Studio, Node/pnpm, Android SDK components, and JDK 17 are still required on the Windows machine.

**How to apply:** Keep the generated `android/` directory versioned, keep local keystores and APK outputs ignored, and preserve the existing Android application id when regenerating native files.