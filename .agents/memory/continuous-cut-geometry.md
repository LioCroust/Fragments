---
name: Continuous cut geometry
description: The relationship between the visual grid and freeform red cuts.
---

The cyan field may remain visually cell-based and continue to block enemies and count toward score, but the player's red cut is continuous and must not snap to cyan cell boundaries.

**Why:** The user wants the cyan cells to remain a visual/gameplay layer while allowing the red trait to be drawn anywhere.

**How to apply:** Keep grid cells for capture bookkeeping and enemy gameplay, but never reposition the player or final red-trail point to a cell edge solely because it enters a cyan cell.