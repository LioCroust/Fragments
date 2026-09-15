---
name: Skia publisher readiness
description: Android behavior when native game logic starts before Skia image hooks finish decoding
---

The native game and Skia publisher must be initialized as soon as the dynamic arena reports its first positive layout, even when AsyncStorage or sprite images are still pending. The picture builder must tolerate missing images and draw the gameplay-critical geometry procedurally.

**Why:** Android can run the update loop at 59–60 FPS while storage/image startup gates remain unresolved. The result is the default HUD at 0 FPS over a completely black arena, with no drone, enemies, movement, or usable gameplay.

**How to apply:** Start the native game from the first positive arena layout. Treat AsyncStorage hydration, sector preloading, and image decoding as background work; never gate game initialization, input handlers, or Skia publication on them.