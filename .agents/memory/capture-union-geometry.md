---
name: Capture union geometry
description: Rules for rendering and measuring captured surfaces without seams, holes, or double-counted area.
---

Captured territory must be resolved through an exact coordinate-compressed orthogonal subdivision. Protected trails and the arena perimeter are barriers; compare connectivity before and after the new cut, then select the smallest newly separated unclaimed component without a minimum-area exception. Store the result as disjoint orthogonal rectangles, never by walking sampled historical polygon loops.

**Why:** Sampled-loop reconstruction repeatedly invented diagonal closing edges and left triangular holes after successive captures. Before/after connectivity prevents retraced boundaries from masquerading as new captures, while disjoint rectangles make cumulative area exact.

**How to apply:** Preserve one canonical connected orthogonal path, including tiny 90-degree connectors for corner contacts. Sum disjoint captured rectangles for progress, render them uniformly, and keep protected red trails above the cyan fill.