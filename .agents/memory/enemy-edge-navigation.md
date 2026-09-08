---
name: Enemy edge navigation
description: Enemies must leave perimeter contacts on an inward diagonal instead of ping-ponging between blue borders.
---

Enemy boundary contact must trigger an inward steering window, not a simple velocity inversion. Claimed cells remain hard obstacles, while a genuinely enclosed enemy is destroyed with the full particle burst.

**Why:** Independent axis bounces let an enemy repeatedly traverse between two perimeter edges and visually flip direction at each contact.

**How to apply:** Preserve an edge-turn timer and inward heading after blue-boundary contact; use body-footprint obstacle checks and keep enclosure detection ahead of any rescue movement. The ship is the exception: when its full sprite footprint touches blue or cyan, choose a random valid bounce direction; do not change the shared footprint detection.