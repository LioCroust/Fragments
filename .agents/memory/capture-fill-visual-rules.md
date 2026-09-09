---
name: Capture fill visual rules
description: User-approved visual and gameplay rules for area filling and enemy capture effects.
---

The playable map begins with a uniform 7% cyan surface. A captured region must appear at a final 15% cyan opacity, not stack opacity with the initial surface. During capture, both the progressive opacity and scan line stay clipped to the selected polygon; the rest of the map must never flash at captured opacity. When a cut offers multiple regions, always fill the smallest one; enemies inside that selected region explode with a restrained 200-particle burst.

**Why:** These rules define the intended Qix-style feel and prevent global opacity flashes, overlapping translucent layers, oversized explosions, or the wrong candidate region from changing the experience.

**How to apply:** Preserve these values and the polygon-clipped fill animation in both Canvas and native SVG rendering, and keep enemy-presence handling after the smallest-region decision.