---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

For this Expo Go runtime, do not pass a Skia picture through a Reanimated shared value. On native Android/iOS, `SkiaPictureView` receives the picture through its `picture` prop; `setPicture()` is a web handle method and must not be called on the native ref. Native redraw is handled by the component update.

**Why:** Shared matrix selectors crashed the Reanimated recorder, direct selectors produced invalid float errors, and the shared picture path produced an invalid `SkTextBlob` plus a React re-entrancy error in Expo Go. Calling the web-only `setPicture()` method on the native ref then crashed or silently dropped every frame.

**How to apply:** Keep the game-loop and allocation optimizations independent from renderer changes. Build pictures in the game loop, publish them through local React state to the native `picture` prop at a bounded cadence, and let `SkiaPictureView` perform its native JSI update/redraw.