import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 2.4;
const frameCount = Math.floor(sampleRate * duration);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0x5ec70;

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

const envelope = (time, start, length, attack = 0.012, decay = 3.8) => {
  const localTime = time - start;
  if (localTime < 0 || localTime >= length) return 0;
  return (
    Math.min(1, localTime / attack)
    * Math.exp(-localTime * decay)
    * Math.min(1, (length - localTime) * 24)
  );
};

const tones = [
  { start: 0.04, length: 0.42, frequency: 523.25, pan: -0.62, gain: 0.2 },
  { start: 0.16, length: 0.46, frequency: 659.25, pan: 0.45, gain: 0.19 },
  { start: 0.29, length: 0.52, frequency: 783.99, pan: -0.22, gain: 0.18 },
  { start: 0.45, length: 0.78, frequency: 1046.5, pan: 0.34, gain: 0.2 },
  { start: 0.6, length: 1.12, frequency: 1318.51, pan: -0.12, gain: 0.12 },
];

const glints = [
  { start: 0.23, length: 0.42, from: 1760, to: 2860, pan: -0.88, gain: 0.1 },
  { start: 0.42, length: 0.48, from: 2180, to: 3680, pan: 0.82, gain: 0.085 },
  { start: 0.68, length: 0.64, from: 3100, to: 4700, pan: -0.52, gain: 0.07 },
  { start: 0.95, length: 0.76, from: 4200, to: 1860, pan: 0.58, gain: 0.05 },
];

let filteredNoise = 0;
for (let index = 0; index < frameCount; index += 1) {
  const time = index / sampleRate;

  tones.forEach(({ start, length, frequency, pan, gain }) => {
    const active = envelope(time, start, length, 0.008, 3.35);
    if (!active) return;
    const localTime = time - start;
    const tone = (
      Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2.01 * localTime) * 0.22
      + Math.sin(2 * Math.PI * frequency * 3.997 * localTime) * 0.08
    );
    add(time, tone * active, pan, gain);
  });

  // A soft sub impact marks the actual sector transfer without sounding like
  // the destructive shield-loss effect.
  if (time >= 0.48) {
    const localTime = time - 0.48;
    const impactEnvelope = Math.exp(-localTime * 4.5) * Math.min(1, localTime * 38);
    const impact = (
      Math.sin(2 * Math.PI * 94 * localTime)
      + Math.sin(2 * Math.PI * 188 * localTime) * 0.24
    );
    add(time, impact * impactEnvelope, 0, 0.25);
  }

  // Holographic stereo air keeps the victory cue distinct from the diamond
  // pickup while giving the banner transition a premium luminous tail.
  const rawNoise = random() * 2 - 1;
  filteredNoise = filteredNoise * 0.94 + rawNoise * 0.06;
  if (time >= 0.52 && time < 2.22) {
    const localTime = time - 0.52;
    const airEnvelope = Math.exp(-localTime * 2.4) * Math.min(1, localTime * 18);
    const stereoMotion = Math.sin(2 * Math.PI * 0.66 * localTime);
    add(time, filteredNoise * airEnvelope, -0.35 + stereoMotion * 0.2, 0.045);
    add(time, filteredNoise * airEnvelope, 0.35 + stereoMotion * 0.2, 0.04);
  }

  glints.forEach(({ start, length, from, to, pan, gain }) => {
    if (time < start || time >= start + length) return;
    const localTime = time - start;
    const progress = localTime / length;
    const frequency = from + (to - from) * progress;
    const glintEnvelope = Math.pow(1 - progress, 1.7) * Math.min(1, localTime * 72);
    const glint = (
      Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 1.49 * localTime) * 0.15
    );
    add(time, glint * glintEnvelope, pan, gain);
  });
}

let peak = 0;
for (let index = 0; index < frameCount; index += 1) {
  left[index] = Math.tanh(left[index] * 1.3);
  right[index] = Math.tanh(right[index] * 1.3);
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
  new URL('../assets/audio/sector-transition-victory.wav', import.meta.url).pathname,
);
fs.writeFileSync(outputPath, output);
console.log(`Created ${outputPath} (${duration.toFixed(2)}s, ${sampleRate}Hz stereo)`);