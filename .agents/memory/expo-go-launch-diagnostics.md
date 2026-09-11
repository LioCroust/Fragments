---
name: Expo Go launch diagnostics
description: Durable debugging guidance for Expo Go launch regressions in Fragments Neon.
---

When Expo Go fails to download or launch after dependency edits, compare the package manifest and lockfile first, clear Metro's cache, and preserve preflight logs for the Expo, router, asset, audio, React, and React Native versions.

**Why:** A launch failure can look like a JavaScript regression even when the cause is a stale Metro cache or an out-of-sync dependency lock; restoring the aligned runtime and clearing the cache restored the game launch.

**How to apply:** Run the app's startup preflight before Metro, inspect its alignment warnings and required-path checks, then only investigate game code after the iOS/Android bundle succeeds.