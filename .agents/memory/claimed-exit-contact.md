---
name: Claimed-surface exit contact
description: New cuts leaving an already captured surface must begin at the exact continuous boundary crossing.
---

When the drone leaves a captured polygon, anchor the new red trail at the geometric intersection with that polygon boundary, not at the previous animation frame's interior position.

**Why:** An interior anchor creates thin unfilled wedges beside protected trails after several successive captures, especially when the next cut crosses existing boundaries.

**How to apply:** Compute the first segment/polygon-boundary intersection (with a binary-search fallback for degenerate edges) before building the capture polygon and storing the protected trail.