import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 2.25;
const frameCount = Math.floor(sampleRate * duration);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0x7a31e;

const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const panLeft = (pan) => Math.cos((pan + 1) * Math.PI * 0.25);
const panRight = (pan) => Math.sin((pan + 1) * Math.PI * 0.25);

const add = (index, value, pan = 0, gain = 1) => {
  if (index < 0 || index >= frameCount) return;
  left[index] += value * gain * panLeft(pan);
  right[index] += value * gain * panRight(pan);
};

const envelope = (time, start, length, attack = 0.01, decay = 3.2) => {
  const localTime = time - start;
  if (localTime < 0 || localTime >= length) return 0;
  const attackAmount = Math.min(1, localTime / attack);
  const releaseAmount = Math.min(1, (length - localTime) * 18);
  return attackAmount * Math.exp(-localTime * decay) * releaseAmount;
};

const notes = [
  { time: 0.04, frequency: 261.63, length: 0.32, pan: -0.5 },
  { time: 0.18, frequency: 329.63, length: 0.34, pan: -0.2 },
  { time: 0.32, frequency: 392.0, length: 0.38, pan: 0.14 },
  { time: 0.47, frequency: 523.25, length: 0.52, pan: 0.42 },
  { time: 0.65, frequency: 659.25, length: 0.72, pan: -0.15 },
];

for (let index = 0; index < frameCount; index += 1) {
  const time = index / sampleRate;
  let filteredNoise = 0;

  // A short, clean achievement impact gives the cue a decisive start.
  const impactTime = time - 0.015;
  if (impactTime >= 0) {
    const impactEnvelope = Math.exp(-impactTime * 8) * Math.min(1, impactTime * 120);
    const impact = Math.sin(2 * Math.PI * 72 * impactTime)
      + Math.sin(2 * Math.PI * 144 * impactTime) * 0.32;
    add(index, impact * impactEnvelope, 0, 0.28);
  }

  notes.forEach(({ time: start, frequency, length, pan }) => {
    const active = envelope(time, start, length, 0.008, 2.9);
    if (!active) return;
    const localTime = time - start;
    const vibrato = 1 + Math.sin(localTime * 7.4) * 0.002;
    const fundamental = Math.sin(2 * Math.PI * frequency * vibrato * localTime);
    const fifth = Math.sin(2 * Math.PI * frequency * 1.5 * localTime) * 0.18;
    const octave = Math.sin(2 * Math.PI * frequency * 2 * localTime) * 0.1;
    add(index, (fundamental + fifth + octave) * active, pan, 0.22);
  });

  // The final major chord is held long enough to read as a completed level.
  if (time >= 0.82 && time < 2.08) {
    const localTime = time - 0.82;
    const chordEnvelope = Math.exp(-localTime * 1.65) * Math.min(1, localTime * 35);
    const chord = (
      Math.sin(2 * Math.PI * 523.25 * localTime)
      + Math.sin(2 * Math.PI * 659.25 * localTime) * 0.76
      + Math.sin(2 * Math.PI * 783.99 * localTime) * 0.62
      + Math.sin(2 * Math.PI * 1046.5 * localTime) * 0.34
    );
    add(index, chord * chordEnvelope, -0.16, 0.18);
    add(index, chord * chordEnvelope, 0.22, 0.17);
  }

  // Bright stereo glints sell the futuristic sector-complete moment.
  const glintStart = 0.64;
  const glintLength = 0.9;
  if (time >= glintStart && time < glintStart + glintLength) {
    const localTime = time - glintStart;
    const progress = localTime / glintLength;
    const frequency = 1200 + progress * 3100;
    const glintEnvelope = Math.pow(1 - progress, 1.7) * Math.min(1, localTime * 65);
    const glint = Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2.01 * localTime) * 0.22;
    const pan = -0.75 + progress * 1.5;
    add(index, glint * glintEnvelope, pan, 0.075);
  }

  // Very quiet filtered air gives the tail a little scale without masking the tones.
  filteredNoise = filteredNoise * 0.95 + (random() * 2 - 1) * 0.05;
  if (time >= 0.84) {
    const tailEnvelope = Math.exp(-(time - 0.84) * 2.8);
    add(index, filteredNoise * tailEnvelope, -0.35, 0.025);
    add(index, filteredNoise * tailEnvelope, 0.35, 0.024);
  }
}

let peak = 0;
for (let index = 0; index < frameCount; index += 1) {
  left[index] = Math.tanh(left[index] * 1.4);
  right[index] = Math.tanh(right[index] * 1.4);
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

const outputGain = peak > 0 ? 0.82 / peak : 1;
for (let index = 0; index < frameCount; index += 1) {
  const offset = 44 + index * 4;
  output.writeInt16LE(Math.round(clamp(left[index] * outputGain, -1, 1) * 32767), offset);
  output.writeInt16LE(Math.round(clamp(right[index] * outputGain, -1, 1) * 32767), offset + 2);
}

const outputPath = path.resolve(
  new URL('../assets/audio/sector-transition-victory-heroic.wav', import.meta.url).pathname,
);
fs.writeFileSync(outputPath, output);
console.log(`Created ${outputPath} (${duration.toFixed(2)}s, ${sampleRate}Hz stereo)`);