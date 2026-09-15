---
name: Cooperative native scheduler
description: Android event-loop fairness constraints for the Fragments game loop
---

The native game loop should keep a timestamp guard at 60 FPS and must remain cooperative with React commits, timers, and touch dispatch. On the tested Expo Go Android session, both RAF and a 16 ms timeout were quantized to roughly 20–30 Hz; a bounded `setImmediate` burst with periodic timer yielding is the current fallback to test on-device.

**Why:** A continuous `setImmediate` chain can report 58–59 FPS while starving Android's UI/event work. The visible result is an initial HUD stuck at 0 FPS and a black arena even though the game loop logs look healthy. RAF and 16 ms timers have also measured only 20–30 FPS in Expo Go, so the scheduler choice must be validated on the physical device.

**How to apply:** Keep RAF for web. On Android, use the timestamp guard plus a bounded immediate scheduler only when the device quantizes RAF/timers, yielding to a short timer regularly; then verify HUD, touch dispatch, and native surface output together with the FPS sample.