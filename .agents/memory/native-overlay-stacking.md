---
name: Native overlay stacking
description: React Native overlays must sit outside the arena when Skia is rendered as a sibling native view.
---

On Android, a Skia dynamic view rendered as a sibling can cover React children inside the arena even when those children have a higher local zIndex. Keep the Skia layer at the game bounds so its outside-frame rendering remains intact, and put banners in a separate sibling overlay rendered after it.

**Why:** Native view stacking is resolved across parent boundaries, so a banner inside the arena can appear behind the red trail or sprites rendered by the sibling Skia layer. Moving Skia into the arena to change ordering can interfere with the player's outside-frame visibility.

**How to apply:** Render transient native banners in a sibling layer after the absolute Skia layer, with a higher zIndex/elevation and the same arena-relative position. Keep the Skia layer's visual overflow unchanged.