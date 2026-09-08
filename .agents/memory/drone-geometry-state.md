---
name: Drone geometry states
description: The drone uses geometric perimeter states instead of treating the blue border or outer band as grid collisions.
---

The drone has four distinct states: free outside the blue perimeter, crossing the perimeter, free inside the playfield, and active cutting. The blue perimeter is a transition boundary, never a damage collider.

**Why:** Mixing the drone radius, safe-band cells, blue border, and claimed grid caused false stops, blocked entry, and spurious explosions.

**How to apply:** Clamp only to the physical screen edge outside; allow exact center crossing at the perimeter; start the red trail only on an interior empty cell; use segment distance for red-trail collisions and body distance for enemies. Keep entry contacts (behind the drone) separate from exit contacts (in the travel direction) so rightward travel cannot map to the left edge. Captured cells are walkable for the drone; only enemies treat them as blocked. When starting a cut from captured ground, anchor it at the cyan-to-empty transition rather than the outer perimeter, and do not classify the straight trail behind the drone as a self-hit.

Enemy movement must use the full rendered sprite footprint against EMPTY cells, not only the enemy center or a circular proxy. A completed red boundary remains visible while its enclosed cells fill cyan, then clears after the fill finishes.