---
name: Skia publisher readiness
description: Android behavior when native game logic starts before Skia image hooks finish decoding
---

The native game and Skia publisher must be initialized as soon as the dynamic arena reports its first positive layout, even when AsyncStorage or sprite images are still pending. The picture builder must tolerate missing images and draw the gameplay-critical geometry procedurally.

**Why:** Android can run the update loop at 59–60 FPS while storage/image startup gates remain unresolved. The result is the default HUD at 0 FPS over a completely black arena, with no drone, enemies, movement, or usable gameplay.

**How to apply:** Start the native game from the first positive arena layout. Treat AsyncStorage hydration, sector preloading, and image decoding as background work; never gate game initialization, input handlers, or Skia publication on them.

On Expo 57/Fabric, treat `SkiaPictureView` as a separate Android texture surface: mount it inside an explicit non-collapsable wrapper with fixed dimensions, and keep the complete native scene (PNG background, frame, and gameplay) in the same picture rather than relying on an SVG sibling beneath it. The direct `SkiaPictureView` layout callback is not a reliable Fabric measurement signal; use the wrapper for diagnostics. Do not enable `androidWarmup` for steady state: when the first picture is not attached, its bitmap path can paint a black layer over the static arena.

**Why:** The JS game loop and picture builder can be healthy at 58–59 FPS while the texture surface remains visually absent or masks the static sibling layer. A separate fixed native wrapper makes the surface attachable and a self-contained picture removes cross-surface stacking ambiguity. The Android warmup bitmap path reproduced the black overlay seen on the device.

**How to apply:** For Android Skia scenes that must render outside the frame, give the wrapper the expanded render margin and position it explicitly. Keep the gameplay renderer on Skia; do not switch dynamic sprites back to SVG. Mount the Skia image hooks before gameplay and gate native reveal until they report ready; separately warm the native backdrop cache for the active sector and its upcoming window. Validate the warmup path on Expo Go before treating the phone output as fixed.