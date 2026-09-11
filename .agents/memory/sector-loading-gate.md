---
name: Sector loading gate
description: The game must hide all gameplay UI behind a black loading screen until image assets are actually decoded.
---

The initial game reveal is gated by real image load completion, not by scheduling preload promises. On web, each local image must resolve through `Image.onload`; the loading banner exits to the right only after the target sector and shared visual assets are ready.

**Why:** Treating web image preload as an already-resolved promise allowed the game to appear while sprites were still decoding, especially on a cold start or slow device.

**How to apply:** Keep the loading overlay above the cockpit, HUD, arena, and controls. After the reveal animation completes, hide it and enqueue the sector-start banner.