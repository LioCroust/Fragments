---
name: Boss sector rules
description: The gameplay constraints that keep the every-tenth-sector boss encounters readable and fair.
---

Boss sectors contain exactly one boss, no active diamonds or bombs, and use the existing capture victory rather than a separate health-bar system. Boss artwork is enlarged for telegraphing, while collision geometry stays substantially smaller than the visual footprint.

**Why:** The game is built around readable continuous cuts; extra enemies, pickups, or a second defeat mechanic make the milestone sectors noisy and undermine fair timing.

**How to apply:** Preserve this structure for sectors 10, 20, 30, 40, and 50 whenever boss behavior, rewards, or visuals are changed.