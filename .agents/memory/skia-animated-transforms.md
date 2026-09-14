---
name: Skia animated transforms
description: Non-obvious React Native Skia and Reanimated constraints for the game’s native render path.
---

For this Expo Go runtime, the native dynamic arena now uses a Skia picture rebuilt from the live game object and published through one shared picture value; React receives only a throttled static snapshot. Shared-value sprite motion remains unverified and should not be reintroduced without an on-device test.

**Why:** Shared matrix selectors crashed the Reanimated recorder, direct selectors produced invalid float errors, and derived shared values left sprites visually frozen in Expo Go. The picture publisher keeps the game loop off React while avoiding those transform mechanisms.

**How to apply:** Keep player and enemy positions in the game object, build all dynamic native geometry from that object, and reserve React/SVG for static or throttled state. Only revisit shared-value motion after a minimal isolated device test.