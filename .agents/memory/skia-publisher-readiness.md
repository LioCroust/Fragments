---
name: Skia publisher readiness
description: Android behavior when native game logic starts before Skia image hooks finish decoding
---

The native Skia publisher must be installed as soon as the dynamic arena mounts, even when some sprite images are still unavailable. The picture builder must tolerate missing images and draw the gameplay-critical geometry procedurally.

**Why:** Android can run the update loop at 59–60 FPS while a publisher gated on all image readiness remains unset. The result looks like a responsive HUD with no drone, enemies, movement, or usable gameplay.

**How to apply:** Treat image decoding as optional visual enhancement, not an initialization prerequisite. Keep the game state, input handlers, sector transitions, and Skia publication active independently of sprite readiness.