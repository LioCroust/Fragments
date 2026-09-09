import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 2.56;
const frameCount = Math.floor(sampleRate * duration);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0x51e1d;
let filteredNoise = 0;

const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const equalPowerLeft = (pan) => Math.cos((pan + 1) * Math.PI * 0.25);
const equalPowerRight = (pan) => Math.sin((pan + 1) * Math.PI * 0.25);

const add = (time, value, pan = 0, gain = 1) => {
  const index = Math.floor(time * sampleRate);
  if (index < 0 || index >= frameCount) return;
  left[index] += value * gain * equalPowerLeft(pan);
  right[index] += value * gain * equalPowerRight(pan);
};

const expDecay = (time, start, decay) => (
  time < start ? 0 : Math.exp(-(time - start) * decay)
);

for (let index = 0; index < frameCount; index += 1) {
  const time = index / sampleRate;

  // A failing engine sputters before the actual hit, giving the destruction
  // a readable approach instead of making it sound like a menu notification.
  if (time < 0.38) {
    const engineEnvelope = Math.pow(1 - time / 0.38, 0.72);
    const sputter = 0.55 + 0.45 * Math.sin(2 * Math.PI * 9.5 * time);
    const engineFrequency = 58 + Math.sin(2 * Math.PI * 2.7 * time) * 8;
    const engine = Math.sin(2 * Math.PI * engineFrequency * time)
      + Math.sin(2 * Math.PI * engineFrequency * 2.01 * time) * 0.28;
    add(time, engine * sputter * engineEnvelope, 0, 0.16);
  }

  // The shield collapses into a heavy hull impact at 0.38s.
  if (time >= 0.34) {
    const impactTime = time - 0.34;
    const impactEnvelope = Math.exp(-impactTime * 6.8);
    const impactFrequency = 112 - Math.min(76, impactTime * 88);
    const impact = Math.sin(2 * Math.PI * impactFrequency * impactTime)
      * (0.78 + 0.22 * Math.sin(2 * Math.PI * 7 * impactTime))
      * impactEnvelope;
    add(time, impact, 0, 0.62);
  }

  // Low-passed debris noise supplies the broad body of the explosion.
  const rawNoise = random() * 2 - 1;
  filteredNoise = filteredNoise * 0.965 + rawNoise * 0.035;
  if (time >= 0.35 && time < 1.42) {
    const blastTime = time - 0.35;
    const blastEnvelope = Math.exp(-blastTime * 3.8) * Math.min(1, blastTime * 34);
    add(time, filteredNoise * blastEnvelope, -0.18, 0.22);
    add(time, filteredNoise * blastEnvelope, 0.18, 0.2);
  }

  // A sequence of hull tears spreads across the stereo field.
  const hullBreaks = [
    { start: 0.37, length: 0.22, from: 1280, to: 180, pan: -0.8, gain: 0.25 },
    { start: 0.49, length: 0.3, from: 980, to: 120, pan: 0.74, gain: 0.22 },
    { start: 0.66, length: 0.38, from: 760, to: 82, pan: -0.42, gain: 0.2 },
    { start: 0.84, length: 0.48, from: 610, to: 62, pan: 0.35, gain: 0.16 },
  ];
  hullBreaks.forEach(({ start, length, from, to, pan, gain }) => {
    if (time < start || time >= start + length) return;
    const tearTime = time - start;
    const progress = tearTime / length;
    const frequency = from + (to - from) * progress;
    const envelope = Math.pow(1 - progress, 1.35);
    const tear = (
      Math.sin(2 * Math.PI * frequency * tearTime)
      + Math.sin(2 * Math.PI * frequency * 1.71 * tearTime) * 0.32
      + Math.sin(2 * Math.PI * frequency * 3.07 * tearTime) * 0.12
    ) * envelope;
    add(time, Math.tanh(tear * 1.6), pan, gain);
  });

  // Bright fragments are thrown outward and then cool down into dark metal.
  const shards = [
    { start: 0.42, length: 0.58, from: 2280, to: 330, pan: -0.9, gain: 0.15 },
    { start: 0.5, length: 0.46, from: 2680, to: 410, pan: 0.86, gain: 0.14 },
    { start: 0.61, length: 0.72, from: 1840, to: 220, pan: -0.58, gain: 0.12 },
    { start: 0.78, length: 0.64, from: 1520, to: 170, pan: 0.56, gain: 0.1 },
    { start: 1.02, length: 0.78, from: 1180, to: 110, pan: -0.22, gain: 0.08 },
  ];
  shards.forEach(({ start, length, from, to, pan, gain }) => {
    if (time < start || time >= start + length) return;
    const shardTime = time - start;
    const progress = shardTime / length;
    const frequency = from + (to - from) * progress;
    const envelope = Math.pow(1 - progress, 1.9);
    const tone = Math.sin(2 * Math.PI * frequency * shardTime)
      + Math.sin(2 * Math.PI * frequency * 2.03 * shardTime) * 0.22;
    add(time, tone * envelope, pan, gain);
  });

  // The reactor whine continues after the hull has broken apart and powers down.
  [
    { start: 0.62, from: 238, to: 76, pan: -0.3, gain: 0.2, decay: 2.9 },
    { start: 0.74, from: 356, to: 104, pan: 0.26, gain: 0.14, decay: 3.7 },
    { start: 0.9, from: 524, to: 148, pan: 0.62, gain: 0.1, decay: 4.5 },
  ].forEach(({ start, from, to, pan, gain, decay }) => {
    if (time < start) return;
    const tailTime = time - start;
    const envelope = expDecay(time, start, decay) * Math.min(1, tailTime * 55);
    const progress = Math.min(1, tailTime / 1.8);
    const frequency = from + (to - from) * progress;
    const tone = Math.sin(2 * Math.PI * frequency * tailTime)
      + Math.sin(2 * Math.PI * frequency * 1.49 * tailTime) * 0.16;
    add(time, tone * envelope, pan, gain);
  });

  // Small late electrical arcs mark the final loss of power.
  [
    { start: 1.18, length: 0.26, frequency: 1240, pan: -0.7, gain: 0.08 },
    { start: 1.43, length: 0.31, frequency: 890, pan: 0.72, gain: 0.06 },
    { start: 1.76, length: 0.22, frequency: 620, pan: -0.18, gain: 0.045 },
  ].forEach(({ start, length, frequency, pan, gain }) => {
    if (time < start || time >= start + length) return;
    const arcTime = time - start;
    const arcEnvelope = Math.pow(1 - arcTime / length, 2.2);
    const arc = Math.sin(2 * Math.PI * frequency * arcTime)
      + Math.sin(2 * Math.PI * frequency * 2.7 * arcTime) * 0.18;
    add(time, arc * arcEnvelope, pan, gain);
  });
}

let peak = 0;
for (let index = 0; index < frameCount; index += 1) {
  const softClipLeft = Math.tanh(left[index] * 1.25);
  const softClipRight = Math.tanh(right[index] * 1.25);
  left[index] = softClipLeft;
  right[index] = softClipRight;
  peak = Math.max(peak, Math.abs(softClipLeft), Math.abs(softClipRight));
}

const output = Buffer.alloc(44 + frameCount * 4);
output.write('RIFF', 0);
output.writeUInt32LE(36 + frameCount * 4, 4);
output.write('WAVE', 8);
output.write('fmt ', 12);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(2, 22);
output.writeUInt32LE(sampleRate, 24);
output.writeUInt32LE(sampleRate * 4, 28);
output.writeUInt16LE(4, 32);
output.writeUInt16LE(16, 34);
output.write('data', 36);
output.writeUInt32LE(frameCount * 4, 40);

const outputGain = peak > 0 ? 0.88 / peak : 1;
for (let index = 0; index < frameCount; index += 1) {
  const offset = 44 + index * 4;
  output.writeInt16LE(Math.round(clamp(left[index] * outputGain, -1, 1) * 32767), offset);
  output.writeInt16LE(Math.round(clamp(right[index] * outputGain, -1, 1) * 32767), offset + 2);
}

const outputPath = path.resolve(
  new URL('../assets/audio/shield-loss-explosion.wav', import.meta.url).pathname,
);
fs.writeFileSync(outputPath, output);
console.log(`Created ${outputPath} (${duration.toFixed(2)}s, ${sampleRate}Hz stereo)`);