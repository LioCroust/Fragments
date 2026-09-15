---
name: Android transparent status bar
description: The game cockpit must remain visible behind Android system status icons.
---

Android status-bar transparency depends on both the native theme and the runtime configuration. Keep the system background transparent, use a translucent light-content status bar, and do not hide it when the game needs to show cockpit artwork beneath the system icons.

**Why:** A runtime black background or non-translucent status bar can recreate a black strip even when the Android theme declares a transparent status bar.

**How to apply:** When changing the full-screen game layout, verify the runtime status-bar props in the root layout together with the native theme and keep safe-area padding for HUD content.