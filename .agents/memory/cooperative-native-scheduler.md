---
name: Cooperative native scheduler
description: Android event-loop fairness constraints for the Fragments game loop
---

The native game loop should use the display scheduler on Android so each frame yields to React commits, timers, and touch dispatch. Keep a timestamp guard to cap work at 60 FPS; do not use a continuous `setImmediate` chain for the active native loop.

**Why:** A continuous `setImmediate` chain can report 58–59 FPS while starving Android's UI/event work. The visible result is an initial HUD stuck at 0 FPS and a black arena even though the game loop logs look healthy. Zero-delay timers also previously produced 28–33 FPS.

**How to apply:** Prefer `requestAnimationFrame` on native and web, with the existing timestamp guard. Use a 16 ms timeout only as a runtime fallback when RAF is unavailable; do not mix `setImmediate` into the active frame schedule.