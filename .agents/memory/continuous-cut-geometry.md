---
name: Continuous cut geometry
description: The relationship between the visual grid and freeform red cuts.
---

The cyan grid is decorative only. The player's red cut and all capture topology are continuous and must not snap to visual grid cells.

**Why:** The user wants the red trait to be drawn anywhere, and grid-based bookkeeping would reintroduce visible quantization and mismatched fills.

**How to apply:** Use exact continuous coordinates. Snap only genuine closure contacts to actual perimeter, claimed, protected, or earlier-trail boundaries; if a corner snap would create a diagonal, preserve it with an explicit 90-degree connector.