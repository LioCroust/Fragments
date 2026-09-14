---
name: Active game loop boundary
description: How to avoid editing the historical duplicate game implementation in Fragments Neon.
---

The first implementation in app/index.tsx is the compiled game. A complete historical copy follows inside a block comment, so matching declarations can appear twice in grep results even though only the first copy runs.

**Why:** A broad patch matched the commented copy instead of the active implementation and temporarily removed the functions needed by resetGame.

**How to apply:** Before editing or deleting a duplicate declaration, confirm whether the match is before or after the block-comment boundary. Keep gameplay changes in the first loop and treat the lower copy as reference only.