---
name: Capture fill visual rules
description: User-approved visual and gameplay rules for area filling and enemy capture effects.
---

The playable map begins with a uniform 20% cyan surface. A captured region must appear at a final 40% cyan opacity, not stack opacity with the initial surface. When a cut offers multiple regions, always fill the smallest one; enemies inside that selected region explode with a restrained 200-particle burst.

**Why:** These rules define the intended Qix-style feel and prevent overlapping translucent layers, oversized explosions, or the wrong candidate region from changing the experience.

**How to apply:** Preserve these values in both Canvas and native SVG rendering, and keep enemy-presence handling after the smallest-region decision.