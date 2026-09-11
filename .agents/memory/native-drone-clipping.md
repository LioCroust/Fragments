---
name: Native drone clipping
description: Native SVG rendering must preserve transparent space around the arena for the drone when it starts outside the blue perimeter.
---

On native Expo, the drone can start outside the blue perimeter, so the dynamic SVG viewport needs transparent render margin, a matching shifted viewBox, and a stacking layer above the cockpit header; parent arena overflow must remain visible.

**Why:** A full-bleed SVG can clip anything above its top edge, and the cockpit header can cover the part of a correctly positioned drone that extends above the blue frame, leaving only the tip visible.

**How to apply:** Preserve the expanded native SVG viewport, coordinate-preserving viewBox, and sibling z-order overlay whenever changing arena layers or initial drone placement. Keep web Canvas sizing independent.