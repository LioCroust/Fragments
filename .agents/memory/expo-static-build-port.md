---
name: Expo static build port
description: The static Expo bundle script assumes Metro can use localhost:8081.
---

The static Expo build must have localhost:8081 available because its Metro launcher is non-interactive and cannot accept an automatic port change when another workflow owns that port.

**Why:** The component preview workflow can occupy 8081 and make the build fail before bundling, even while the normal Expo workflow is healthy.

**How to apply:** If the build reports that 8081 is already running, temporarily stop the component preview workflow, run the mobile build, then restart the preview workflow.