---
name: Android immersive status bar
description: The game must use the full Android display without exposing system status icons.
---

The game uses an immersive Android presentation: the status bar is hidden so the cockpit and HUD can occupy the full display without exposing the time or notification icons.

**Why:** Making the status bar transparent still leaves the system icons visible and reserves a top region that the game cannot use as intended.

**How to apply:** Keep the runtime status bar hidden on Android, set the Expo Router Native Stack's status bar to translucent, keep the navigation bar hidden, and verify HUD safe-area padding after immersive mode changes.