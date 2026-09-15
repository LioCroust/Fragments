---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

For this Expo Go runtime, do not pass a Skia picture through a Reanimated shared value. The imperative `SkiaPictureView` path is valid, but its ref can exist before `setPicture` or `redraw` is installed, so the publisher must treat both methods as optional and skip an early frame safely.

**Why:** Shared matrix selectors crashed the Reanimated recorder, direct selectors produced invalid float errors, and the shared picture path produced an invalid `SkTextBlob` plus a React re-entrancy error in Expo Go. The imperative ref then exposed a separate initialization race.

**How to apply:** Keep the game-loop and allocation optimizations independent from renderer changes. Build the picture imperatively, check `pictureViewRef.current`, check `typeof view.setPicture === 'function'`, call it, and call `redraw` only when that method also exists.