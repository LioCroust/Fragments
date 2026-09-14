---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

In Expo Go, Skia shared values should drive sprite movement through direct `x`, `y`, and `opacity` props. Avoid passing a shared-value selector to `matrix`; it can crash the Reanimated recorder with an “object is an object, expected an array” error.

**Why:** The installed Skia types accept shared-value selectors for direct animated props, but the Expo Go runtime rejects the selector object when it reaches the matrix recorder. Nested transform selectors are also rejected by TypeScript.

**How to apply:** Keep player and simple enemy positions in Reanimated shared values, update those values from the game loop, and publish full React snapshots only when SVG effects need them. Keep rotated SVG fallback or use a runtime-supported transform strategy once verified on-device.