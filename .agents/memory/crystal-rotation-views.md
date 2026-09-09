---
name: Crystal rotation views
description: Visual rules for the animated neon crystal collectible.
---

The crystal animation uses four distinct full-width prism drawings with changing facet layouts. Every frame keeps a visible 3D silhouette; no frame collapses into a thin edge or simulates rotation by horizontal scaling.

**Why:** The previous squash-based animation made the crystal look flat and visually move instead of rotating around a stable axis.

**How to apply:** Keep the crystal centered at the same anchor, preserve its overall height and width, and change only the visible prism faces and highlights between frames.