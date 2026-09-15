---
name: Cooperative native scheduler
description: Android event-loop fairness constraints for the Fragments game loop
---

The native game loop should use a fast scheduler for frame cadence. On Android, do not insert zero-delay timers into the active frame schedule: they are quantized to a display interval and can halve the measured cadence.

**Why:** A zero-delay timer inserted every few frames produced stable 28–33 FPS even though collision and rendering stayed below the budget. Native gameplay banners now bypass the JS animation queue, so the active loop can remain on setImmediate.

**How to apply:** Keep the 60 FPS timestamp guard and use setImmediate while gameplay is initialized. Avoid replacing the loop with a 16 ms timer or periodically mixing in setTimeout(0); both previously produced about 30 FPS.