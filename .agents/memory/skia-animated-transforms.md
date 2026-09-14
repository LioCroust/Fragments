---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

For this Expo Go runtime, the attempted shared Skia picture publisher is disabled because Reanimated rejected the picture value and crashed the native recorder; the stable native SVG fallback remains active while the Skia migration is redesigned.

**Why:** Shared matrix selectors crashed the Reanimated recorder, direct selectors produced invalid float errors, and the shared picture path produced an invalid `SkTextBlob` plus a React re-entrancy error in Expo Go.

**How to apply:** Keep the game-loop and allocation optimizations independent from renderer changes. Only re-enable Skia dynamic rendering after a minimal native Canvas test that does not pass a `SkPicture` through a shared value.