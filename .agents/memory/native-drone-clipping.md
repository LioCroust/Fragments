---
name: Native drone clipping
description: Native SVG rendering must preserve transparent space around the arena for the drone when it starts outside the blue perimeter.
---

On native Expo, the drone can start outside the blue perimeter, so the dynamic SVG viewport needs transparent render margin and a matching shifted viewBox; parent arena overflow must remain visible.

**Why:** A full-bleed SVG clips anything above its own top edge even when the game coordinates place the drone correctly, leaving only the tip visible.

**How to apply:** Preserve the expanded native SVG viewport and coordinate-preserving viewBox whenever changing arena layers or initial drone placement. Keep web Canvas sizing independent.