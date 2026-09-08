---
name: Fill chime device validation
description: Records which real-device platforms have confirmed the zone-fill completion chime.
---

The zone-fill completion chime has been confirmed on a real Android device in Expo Go: it plays for each completed zone fill.

**Why:** Audio behavior cannot be established from screenshots or static checks, and platform audio-session behavior differs.

**How to apply:** Treat Android playback as device-confirmed. Do not claim iOS or iOS silent-mode support as device-confirmed until someone tests it on a real iPhone.