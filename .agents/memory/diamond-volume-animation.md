---
name: Diamond volume animation
description: Visual constraint for the collectible diamond rotation.
---

The collectible diamond must read as a solid faceted crystal while rotating horizontally. Its profile should retain visible thickness and layered side depth; avoid a single flat sprite collapsing to a paper-thin strip.

**Why:** A plain horizontal scale made the diamond look like a flat leaf rather than a volumetric object.

**How to apply:** Keep a visible crystal core at profile and use layered refracted side faces/extrusion in both the canvas and native SVG renderers.