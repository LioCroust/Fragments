---
name: Expo audio format
description: Audio asset format compatibility for Expo Go and the Web preview.
---

Short procedural WAV files can pass TypeScript and native asset checks but still throw during Web rendering when supplied to `useAudioPlayer`. MP3 at 44.1 kHz is the safer format for new short game effects.

**Why:** The Web preview failed while constructing a player for a valid raw PCM WAV, while the existing MP3 assets loaded normally.

**How to apply:** Convert generated or synthesized short effects to MP3 before wiring them into Expo audio, then check workflow logs and the Web preview.