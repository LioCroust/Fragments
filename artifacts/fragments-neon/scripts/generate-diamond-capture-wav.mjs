import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 1.82;
const frameCount = Math.floor(sampleRate * duration);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0xd1a0d;

const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const panLeft = (pan) => Math.cos((pan + 1) * Math.PI * 0.25);
const panRight = (pan) => Math.sin((pan + 1) * Math.PI * 0.25);

const add = (time, value, pan = 0, gain = 1) => {
  const index = Math.floor(time * sampleRate);
  if (index < 0 || index >= frameCount) return;
  left[index] += value * gain * panLeft(pan);
  right[index] += value * gain * panRight(pan);
};

const smoothEnvelope = (time, start, length, attack = 0.008, decay = 4.6) => {
  const localTime = time - start;
  if (localTime < 0 || localTime >= length) return 0;
  const attackEnvelope = Math.min(1, localTime / attack);
  const releaseEnvelope = Math.exp(-localTime * decay);
  const endEnvelope = Math.min(1, (length - localTime) * 22);
  return attackEnvelope * releaseEnvelope * endEnvelope;
};

const arp = [
  { start: 0.04, length: 0.42, frequency: 523.25, pan: -0.7 },
  { start: 0.14, length: 0.44, frequency: 659.25, pan: 0.45 },
  { start: 0.25, length: 0.5, frequency: 783.99, pan: -0.25 },
  { start: 0.38, length: 0.62, frequency: 1046.5, pan: 0.55 },
  { start: 0.53, length: 0.86, frequency: 1318.51, pan: -0.18 },
];

const sparkles = [
  { start: 0.18, length: 0.3, from: 1760, to: 2480, pan: -0.86, gain: 0.11 },
  { start: 0.34, length: 0.37, from: 2180, to: 3320, pan: 0.8, gain: 0.09 },
  { start: 0.56, length: 0.48, from: 2860, to: 4180, pan: -0.58, gain: 0.075 },
  { start: 0.78, length: 0.62, from: 3440, to: 1960, pan: 0.62, gain: 0.06 },
  { start: 1.02, length: 0.52, from: 2380, to: 1240, pan: -0.32, gain: 0.045 },
];

let shimmerNoise = 0;
for (let index = 0; index < frameCount; index += 1) {
  const time = index / sampleRate;

  // Bright crystal arpeggio: a clean, ascending identity for the diamond.
  arp.forEach(({ start, length, frequency, pan }) => {
    const envelope = smoothEnvelope(time, start, length, 0.006, 3.8);
    if (!envelope) return;
    const localTime = time - start;
    const shimmer = 1 + Math.sin(2 * Math.PI * 5.5 * localTime) * 0.018;
    const tone = (
      Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2.01 * localTime) * 0.28
      + Math.sin(2 * Math.PI * frequency * 3.997 * localTime) * 0.11
    ) * shimmer;
    add(time, tone * envelope, pan, 0.16);
  });

  // A warm harmonic resolve keeps the reward musical instead of sounding like
  // a dry UI beep.
  [
    { frequency: 261.63, gain: 0.075, pan: -0.2 },
    { frequency: 392, gain: 0.062, pan: 0.2 },
    { frequency: 523.25, gain: 0.052, pan: 0 },
  ].forEach(({ frequency, gain, pan }) => {
    if (time < 0.58) return;
    const localTime = time - 0.58;
    const envelope = Math.exp(-localTime * 2.9) * Math.min(1, localTime * 26);
    const tone = Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2 * localTime) * 0.13;
    add(time, tone * envelope, pan, gain);
  });

  // Filtered stereo shimmer gives the capture a luminous, glass-like tail.
  const rawNoise = random() * 2 - 1;
  shimmerNoise = shimmerNoise * 0.93 + rawNoise * 0.07;
  if (time >= 0.12 && time < 1.68) {
    const localTime = time - 0.12;
    const envelope = Math.exp(-localTime * 2.25) * Math.min(1, localTime * 18);
    const stereoMotion = Math.sin(2 * Math.PI * 0.72 * localTime);
    add(time, shimmerNoise * envelope, -0.34 + stereoMotion * 0.18, 0.07);
    add(time, shimmerNoise * envelope, 0.34 + stereoMotion * 0.18, 0.065);
  }

  // Individual star-like glints sweep through the stereo field.
  sparkles.forEach(({ start, length, from, to, pan, gain }) => {
    if (time < start || time >= start + length) return;
    const localTime = time - start;
    const progress = localTime / length;
    const frequency = from + (to - from) * progress;
    const envelope = Math.pow(1 - progress, 1.8) * Math.min(1, localTime * 70);
    const tone = Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 1.49 * localTime) * 0.17;
    add(time, tone * envelope, pan, gain);
  });
}

let peak = 0;
for (let index = 0; index < frameCount; index += 1) {
  left[index] = Math.tanh(left[index] * 1.35);
  right[index] = Math.tanh(right[index] * 1.35);
  peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
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

const outputGain = peak > 0 ? 0.86 / peak : 1;
for (let index = 0; index < frameCount; index += 1) {
  const offset = 44 + index * 4;
  output.writeInt16LE(Math.round(clamp(left[index] * outputGain, -1, 1) * 32767), offset);
  output.writeInt16LE(Math.round(clamp(right[index] * outputGain, -1, 1) * 32767), offset + 2);
}

const outputPath = path.resolve(
  new URL('../assets/audio/diamond-capture.wav', import.meta.url).pathname,
);
fs.writeFileSync(outputPath, output);
console.log(`Created ${outputPath} (${duration.toFixed(2)}s, ${sampleRate}Hz stereo)`);