---
name: Immediate native snapshot
description: Initial Android arena rendering before the first React snapshot state update
---

When native game state is initialized, the Android arena should be able to derive its first render snapshot directly from the initialized game object. The first React snapshot publication is an optimization, not a launch prerequisite.

**Why:** The game loop and HUD can be alive while the arena remains black if rendering returns null until nativeSnapshot state is published. That makes the app look frozen even when performance logs are healthy.

**How to apply:** Use the current initialized game state as a render fallback for the static and Skia layers, then replace it with the published snapshot as soon as React receives it.