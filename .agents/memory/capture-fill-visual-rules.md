---
name: Capture fill visual rules
description: User-approved visual and gameplay rules for area filling and enemy capture effects.
---

The playable map begins with a uniform 7% cyan surface. A captured region must appear at a final 15% cyan opacity, not stack opacity with the initial surface. During the scan animation, draw no temporary cyan fill at all: only a plain white scan line clipped to the selected region may animate. Commit the selected region to 15% once, at animation completion. When a cut offers multiple regions, always fill the smallest one without any minimum-size exception; enemies inside that region explode with a restrained 200-particle burst.

**Why:** These rules define the intended Qix-style feel and prevent global opacity flashes, overlapping translucent layers, oversized explosions, or the wrong candidate region from changing the experience.

**How to apply:** Preserve these values and white-only scan behavior in both Canvas and native SVG rendering, and keep enemy-presence handling after the unconditional smallest-region decision.