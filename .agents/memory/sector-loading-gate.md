---
name: Sector loading gate
description: The game must hide all gameplay UI behind a black loading screen until image assets are actually decoded.
---

The initial game reveal is gated by real image readiness, not by scheduling preload promises. On web, each local image must resolve through `Image.onload` and finish `decode()` before the loading banner exits; on native, warm the image cache with `Image.prefetch` plus a size check. Only the current/target sector background is loaded, not all 50 backgrounds.

**Why:** `onload` can precede browser decoding, and native SVG images load independently from the game loop. Treating either as ready allowed the game to appear with a black arena before its background was actually drawable.

**How to apply:** Keep the loading overlay above the cockpit, HUD, arena, and controls. Preload shared sprites once, load the current or next background on demand, release the previous background after a transition, then hide the overlay and enqueue the sector-start banner.