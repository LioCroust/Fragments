---
name: Expo Go launch diagnostics
description: Durable debugging guidance for Expo Go launch regressions in Fragments Neon.
---

When Expo Go fails to download or launch after dependency edits, compare the package manifest and lockfile first, preserve preflight logs for the Expo, router, asset, audio, React, and React Native versions, and avoid clearing Metro's cache automatically in the workflow.

**Why:** In this workspace, `--clear` makes the first Android dev bundle request rebuild roughly 20 seconds, while later requests are sub-second; Expo Go and the Replit device preview can time out during that cold build even though Metro is healthy.

**How to apply:** Run the app's startup preflight before Metro, inspect its alignment warnings and required-path checks, keep the Metro cache between workflow restarts, and only use a manual cache clear when stale transforms are proven to be the problem.

For image preloading in this workspace, verify that a declared Expo asset package is actually installed before importing it; React Native's local-image loading APIs are the safe fallback when the workspace install is incomplete.

**Why:** The dependency can appear in the artifact manifest while being absent from the installed workspace modules, which breaks TypeScript and Metro before the game starts.

**How to apply:** Prefer the existing React Native image loader for local visual assets unless the Expo asset package is present in the resolved workspace installation.

The Replit build container may report a React Native DevTools `libglib-2.0.so.0` warning and may have no Android device attached; neither prevents Metro from starting or the Android bundle from being generated.

**Why:** The warning comes from the optional local DevTools binary, while device-side Expo Go errors are only visible on a connected phone.

**How to apply:** Treat this warning separately from app runtime failures; validate the Android bundle and ask for the Expo Go error log only if a connected Android device still fails after a clean reload.

Web screenshots validate only the web preview. They are not evidence that the QR session launches inside Expo Go; native validation must use the Expo Go QR path or an iOS/Android bundle check.

**Why:** The web and native renderers take different code paths, especially for image loading, SVG, audio, and native modules.

**How to apply:** State explicitly which platform was tested, and never report a web screenshot as an Expo Go launch verification.