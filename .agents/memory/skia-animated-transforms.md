---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

For this Expo Go runtime, the reliable hybrid path is to pass numeric `x`, `y`, `opacity`, and plain rotation props from the current game snapshot into the Skia layer. Shared-value sprite motion remains unverified and should not replace the snapshot path without an on-device test.

**Why:** Shared matrix selectors crashed the Reanimated recorder, direct selectors produced invalid float errors, and derived shared values left sprites visually frozen in Expo Go. Plain numeric props avoid all three failure modes.

**How to apply:** Keep player and enemy positions in the game state, pass numeric snapshot values to Skia, and use the SVG path as fallback for multi-enemy cases. Only revisit shared-value motion after a minimal isolated device test.