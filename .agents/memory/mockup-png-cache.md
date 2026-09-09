---
name: Mockup PNG cache
description: Preview-server image caching can make regenerated public PNG assets appear unchanged in screenshots.
---

When a generated PNG in the mockup sandbox is replaced but the isolated preview still shows the old or broken artwork, restart the managed mockup preview workflow before changing the component layout again.

**Why:** The component and asset can be correct on disk while the preview browser/server continues serving a stale public image response.

**How to apply:** After replacing a public PNG, validate the file directly first; if the live screenshot disagrees, restart the mockup preview workflow once and recapture before further edits.