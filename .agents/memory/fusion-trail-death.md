---
name: Fusion trail death
description: Gameplay and visual behavior when an enemy contacts the player's active red cut.
---

An enemy touching the active red cut must not explode itself. Freeze gameplay, animate molten fusion sparks from the impact point along the newest red trail to the drone, then trigger the drone's normal shield-loss explosion at the trail endpoint.

**Why:** The red cut is a conductive danger path during construction; the enemy contact destroys the drone rather than rewarding the player by destroying the enemy.

**How to apply:** Keep active-cut fusion separate from protected red boundaries. Protected boundaries remain impassable to enemies without detonating either side; only an active-cut contact starts the frozen spark sequence.