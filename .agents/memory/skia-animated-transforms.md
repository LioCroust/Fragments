---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

Skia shared values should drive sprite movement and rotation through the `matrix` prop rather than selectors nested inside the `transform` array.

**Why:** The installed Skia types accept shared-value selectors for direct animated props, but reject them inside transform-array entries. A matrix keeps the update off the React render path and preserves rotation.

**How to apply:** Keep the player and simple enemy motion in Reanimated shared values, update those values from the game loop, and publish full React snapshots only when SVG effects need them. Use the SVG path as fallback for unsupported or multi-enemy cases.