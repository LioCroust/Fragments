---
name: Enemy smoke sprite
description: Visual direction for the optimized animated smoke atlas behind enemy ships.
---

Enemy ship smoke should read as a barely visible dark, diffuse plume with soft grey-blue wisps. It must not use neon colors, bright cores, or clearly outlined tentacle-like shapes.

**Why:** The first optimized neon atlas looked like a decorative creature or energy effect rather than smoke; the user explicitly rejected that direction.

**How to apply:** Keep the sprite atlas low-opacity and resource-light, preserve the particle renderer as a reversible fallback, and make smoke decorative only.