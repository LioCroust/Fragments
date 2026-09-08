---
name: Approved enemy art
description: The user-approved generated Fragments Neon enemy sprites and the rule for preserving them.
---

The four generated final sprites in artifacts/fragments-neon/assets/images are the source of truth for Fragments Neon: preserve their silhouettes, multicolor filament glow, and pixel character. Animation should be applied as motion, scale, sway, or rotation around the existing artwork, not by generating replacement creatures or recoloring them. The removed magenta Qix/SVG motif must not be reintroduced.

**Why:** The user explicitly accepted the generated ship, dragon, seven-branch machine, and spider, then asked to remove the old magenta SVG-like motif.

**How to apply:** When changing enemy visuals, start from the existing final PNG sprites and only add animation/rendering behavior. Keep glow controlled so the multicolor details remain sharp.