---
name: Published app billing suspension
description: Replit production URLs can become unavailable after a successful build when usage-based billing suspends the live service.
---

A published app may build and bundle successfully but still show “This app isn’t live yet” when the latest production build is suspended for usage-based billing or quota.

**Why:** Replit can complete the build and create the service before suspending its live hosting when Core credits are exhausted or usage billing is blocked.

**How to apply:** Check deployment build status and the suspension reason before changing application code. A development URL can continue working while the public `.replit.app` URL is unavailable.