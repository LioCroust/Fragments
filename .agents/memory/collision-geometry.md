---
name: Collision geometry
description: Gameplay collisions must use actual geometry instead of grid-cell membership.
---

Gameplay collision decisions must be based on distances to rendered segments and body bounds, not merely on whether the player or enemy occupies a cell marked as trail.

**Why:** Grid-cell checks caused false explosions when movement revisited a cell without physically crossing the laser, and oversized sprite radii caused collisions that were visibly separated.

**How to apply:** Keep a small exclusion window immediately behind the drone, then test true segment distance for old laser crossings and compact body radii for enemy contact.