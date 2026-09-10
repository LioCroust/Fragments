---
name: Boss sector rules
description: The gameplay constraints that keep the every-tenth-sector boss encounters readable and fair.
---

Boss sectors start with exactly one boss and no active diamonds or bombs. Any boss hit by a missile branches into two standard enemies of the same kind, which can later branch into mini-enemies; the encounter still uses capture victory rather than a health bar. Boss artwork is enlarged for telegraphing, while collision geometry stays substantially smaller than the visual footprint.

**Why:** The user explicitly chose a readable multi-stage ship split for the boss while keeping boss sectors free of pickups and health bars.

**How to apply:** Preserve the no-bonus/no-health-bar structure for sectors 10, 20, 30, 40, and 50. Preserve the boss → standard enemies → mini-enemies progression for every boss kind and keep collision geometry fair at every size.