---
name: Native overlay stacking
description: React Native overlays must sit outside the arena when Skia is rendered as a sibling native view.
---

On Android, a Skia dynamic view rendered as a sibling can cover React children inside the arena even when those children have a higher local zIndex. Put banners and other first-plane overlays after the Skia layer in the parent hierarchy.

**Why:** Native view stacking is resolved across parent boundaries, so a banner inside the arena can appear behind the red trail or sprites rendered by the sibling Skia layer.

**How to apply:** Keep the dynamic Skia layer inside the arena only when the parent permits its required visual overflow, then render transient banners after that layer or in a sibling overlay above the arena.