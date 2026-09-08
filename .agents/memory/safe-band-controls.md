---
name: Safe band controls
description: The drone must be able to traverse the outer claimed band before starting a cut.
---

Directional input must remain latched long enough for the drone to leave the outer safe band; releasing a swipe there must not stop it before it reaches the empty playfield.

**Why:** The drone starts outside the perimeter and a short swipe was being cleared before it could cross the safe band, making the arena appear unreachable.

**How to apply:** Preserve the input while the player is on the safe perimeter, allow free tangential movement there, and hand control to the laser only after entering an empty cell.