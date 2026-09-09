import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 1.18;
const frameCount = Math.floor(sampleRate * duration);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0x51e1d;

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

  // A compact sub impact gives the shield hit weight without swallowing the
  // brighter capture sound already used by the game.
  const impactTime = time;
  const impactEnvelope = Math.exp(-impactTime * 13.5);
  const impactFrequency = 104 - Math.min(58, impactTime * 105);
  const impact = Math.sin(2 * Math.PI * impactFrequency * impactTime)
    * (0.72 + 0.28 * Math.sin(2 * Math.PI * 6.5 * impactTime))
    * impactEnvelope;
  add(time, impact, 0, 0.48);

  // Short distorted crack: a descending metallic edge over the impact.
  if (time >= 0.012 && time < 0.28) {
    const crackTime = time - 0.012;
    const crackEnvelope = Math.exp(-crackTime * 18);
    const crackFrequency = 920 - crackTime * 2450;
    const crack = (
      Math.sin(2 * Math.PI * crackFrequency * crackTime)
      + Math.sin(2 * Math.PI * crackFrequency * 1.97 * crackTime) * 0.32
      + Math.sin(2 * Math.PI * crackFrequency * 3.01 * crackTime) * 0.14
    ) * crackEnvelope;
    add(time, Math.tanh(crack * 1.4), -0.08, 0.26);
  }

  // A very short noise burst sells the shield fracture instead of a clean UI beep.
  if (time >= 0.018 && time < 0.11) {
    const noiseEnvelope = Math.exp(-(time - 0.018) * 39);
    const noise = (random() * 2 - 1) * noiseEnvelope;
    add(time, noise, -0.28, 0.16);
    add(time, noise, 0.28, 0.12);
  }

  // Bright fragments move from white-hot to orange and fall away in stereo.
  const shards = [
    { start: 0.06, length: 0.34, from: 1820, to: 360, pan: -0.82, gain: 0.18 },
    { start: 0.085, length: 0.28, from: 2380, to: 510, pan: 0.72, gain: 0.15 },
    { start: 0.13, length: 0.42, from: 1480, to: 280, pan: -0.42, gain: 0.12 },
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

  // The tail keeps the sound in the same luminous, futuristic family as capture.
  [
    { start: 0.16, frequency: 312, pan: -0.35, gain: 0.14, decay: 5.4 },
    { start: 0.22, frequency: 468, pan: 0.3, gain: 0.11, decay: 6.1 },
    { start: 0.29, frequency: 702, pan: 0.62, gain: 0.08, decay: 7.2 },
  ].forEach(({ start, frequency, pan, gain, decay }) => {
    if (time < start) return;
    const tailTime = time - start;
    const envelope = expDecay(time, start, decay) * Math.min(1, tailTime * 55);
    const tone = Math.sin(2 * Math.PI * frequency * tailTime)
      + Math.sin(2 * Math.PI * frequency * 1.5 * tailTime) * 0.12;
    add(time, tone * envelope, pan, gain);
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