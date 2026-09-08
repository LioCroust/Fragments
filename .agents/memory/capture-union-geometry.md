---
name: Capture union geometry
description: Rules for rendering and measuring captured surfaces without seams, holes, or double-counted area.
---

Boundary loops may be sampled for navigation, but a capture polygon must replace its sampled start and end points with the exact continuous trail endpoints. Otherwise tiny triangular gaps appear at perimeter joins.

**Why:** Summing captured polygon areas double-counts overlaps and produces incorrect progress percentages; drawing separate translucent polygons also creates visibly different opacities.

**How to apply:** Compose captured surfaces as one uniform layer and calculate progress from the geometric union of the captured polygons. Keep protected red trails as a separate layer above the cyan fill.