---
name: Enemy smoke sprite
description: Visual direction for the optimized animated smoke atlas behind enemy ships.
---

Enemy ship smoke should read as one barely visible but readable dark aircraft-like plume with soft grey-blue wisps. It must not use neon colors, bright cores, circular blobs, or clearly outlined tentacle-like shapes; the source atlas may contain multiple internal wisps, so the renderer must mask it to one visible plume.

**Why:** The first optimized neon atlas looked like a decorative creature or energy effect rather than smoke; the user explicitly rejected that direction. Pure black smoke also disappeared too much against the arena.

**How to apply:** Keep the sprite atlas low-opacity and resource-light, mask each frame to one plume, preserve the particle renderer as a reversible fallback with one puff per ship, and make smoke decorative only.