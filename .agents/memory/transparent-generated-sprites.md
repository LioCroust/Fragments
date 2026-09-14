---
name: Transparent generated sprites
description: Generated PNGs requested with background removal may still contain a baked checkerboard and must be alpha-validated before use.
---

Treat every generated transparent sprite as untrusted until its PNG metadata confirms a real alpha channel and a dark-background composite shows no checkerboard.

**Why:** The image-generation result for the electric drone thrust effect was RGB with a visible checkerboard despite being requested as transparent; integrating it directly would have rendered the checkerboard in-game.

**How to apply:** Inspect generated PNG channels before wiring the asset into Expo, and use a local mask/compositing step or another image tool when the background is baked into the raster.