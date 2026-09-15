---
name: Space-opera cover composition
description: Precision rules for Fragments Neon portrait cover art.
---

For portrait cover concepts, preserve the user-provided Prism Arrow reference when the rear-axis beam must be exact. Build the environment and distant enemy placement around that locked foreground instead of asking image generation to redraw the drone and line.

**Why:** Image generation repeatedly warped the beam and enlarged the enemies. Deterministic compositing kept the beam straight, coaxial, and visually consistent while allowing space-opera variations.

**How to apply:** Keep enemies small and distant, favor navy/cobalt/cyan/white with restrained amber accents, and use transparent composition layers. When rotating transparent enemy PNGs with ImageMagick, set `-background none` before `-rotate` or white corner boxes appear.