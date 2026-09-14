---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

In Expo Go, Skia shared values should drive sprite movement through direct `x`, `y`, and `opacity` props backed by `useDerivedValue`. Avoid passing a `select(...)` selector or shared-value selector to `matrix`.

**Why:** The installed Skia types accept shared-value selectors for direct animated props, but Expo Go’s runtime rejected the selector object with an “invalid float prop value” error. A shared matrix selector previously caused an “object is an object, expected an array” error. Nested transform selectors are also rejected by TypeScript.

**How to apply:** Keep player and simple enemy positions in Reanimated shared values, expose them to Skia through `useDerivedValue`, update those values from the game loop, and publish full React snapshots only when SVG effects need them. Keep rotated SVG fallback or use a runtime-supported transform strategy once verified on-device.