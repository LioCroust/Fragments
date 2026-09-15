---
name: Cooperative native scheduler
description: Android event-loop fairness constraints for the Fragments game loop
---

The native game loop may use a fast scheduler for frame cadence, but it must periodically yield to the timer queue. A continuous setImmediate chain is not safe for UI-driven Android gameplay.

**Why:** The loop can maintain a healthy FPS metric while preventing Animated callbacks and touch dispatch from completing. This leaves a sector-start banner visible and makes the game appear frozen.

**How to apply:** Keep the 60 FPS pacing guard, but insert a regular zero-delay timer yield after a small number of immediate frames. Avoid replacing the loop wholesale with a 16 ms timer, which previously produced about 30 FPS.