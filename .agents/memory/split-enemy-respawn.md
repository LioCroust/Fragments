---
name: Split enemy respawn
description: A collision restart must preserve every still-live split enemy in the current sector.
---

When the drone explodes and the player resumes the same sector, preserve every live enemy with `isMini` or `splitLevel`, regardless of kind. Already destroyed split enemies must stay absent; starting a new sector still creates a fresh roster.

**Why:** The old restart path special-cased split ships, so mini-dragons, mini-SEVEN and mini-spiders disappeared after a collision even though mini-ships behaved correctly.

**How to apply:** Filter the current enemy roster by split metadata and destroyed state before rebuilding the base roster. Reattach live split instances only when `resetBoard` is false.