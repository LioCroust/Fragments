import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 4.1;
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
  { time: 0.04, frequency: 523.25, length: 0.26, pan: -0.56 },
  { time: 0.22, frequency: 659.25, length: 0.28, pan: -0.22 },
  { time: 0.4, frequency: 783.99, length: 0.3, pan: 0.18 },
  { time: 0.58, frequency: 1046.5, length: 0.42, pan: 0.48 },
  { time: 0.8, frequency: 1318.51, length: 0.48, pan: -0.3 },
  { time: 1.02, frequency: 1567.98, length: 0.52, pan: 0.28 },
  { time: 1.24, frequency: 1318.51, length: 0.5, pan: -0.4 },
  { time: 1.46, frequency: 1567.98, length: 0.62, pan: 0.34 },
  { time: 1.68, frequency: 2093.0, length: 0.78, pan: -0.08 },
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
    const active = envelope(time, start, length, 0.006, 4.5);
    if (!active) return;
    const localTime = time - start;
    const vibrato = 1 + Math.sin(localTime * 7.4) * 0.002;
    const fundamental = Math.sin(2 * Math.PI * frequency * vibrato * localTime);
    const fifth = Math.sin(2 * Math.PI * frequency * 1.5 * localTime) * 0.18;
    const octave = Math.sin(2 * Math.PI * frequency * 2 * localTime) * 0.1;
    add(index, (fundamental + fifth + octave) * active, pan, 0.22);
  });

  // The final major chord is held long enough to read as a completed level.
  if (time >= 1.9 && time < 3.82) {
    const localTime = time - 1.9;
    const chordEnvelope = Math.exp(-localTime * 0.76) * Math.min(1, localTime * 30);
    const chord = (
      Math.sin(2 * Math.PI * 1046.5 * localTime)
      + Math.sin(2 * Math.PI * 1318.51 * localTime) * 0.8
      + Math.sin(2 * Math.PI * 1567.98 * localTime) * 0.7
      + Math.sin(2 * Math.PI * 2093.0 * localTime) * 0.42
    );
    add(index, chord * chordEnvelope, -0.16, 0.18);
    add(index, chord * chordEnvelope, 0.22, 0.17);
  }

  // Quick bell-like sparkles make this version feel celebratory rather than solemn.
  const bellNotes = [
    { time: 0.14, frequency: 1046.5, pan: -0.7 },
    { time: 0.37, frequency: 1318.51, pan: 0.7 },
    { time: 0.61, frequency: 1567.98, pan: -0.55 },
    { time: 0.88, frequency: 2093.0, pan: 0.62 },
    { time: 1.12, frequency: 2349.32, pan: -0.4 },
    { time: 1.38, frequency: 2637.02, pan: 0.46 },
  ];
  bellNotes.forEach(({ time: start, frequency, pan }) => {
    const bellEnvelope = envelope(time, start, 0.34, 0.003, 8.2);
    if (!bellEnvelope) return;
    const localTime = time - start;
    const bell = Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2.01 * localTime) * 0.3
      + Math.sin(2 * Math.PI * frequency * 3.98 * localTime) * 0.12;
    add(index, bell * bellEnvelope, pan, 0.065);
  });

  // Bright stereo glints sell the futuristic sector-complete moment.
  const glintStart = 0.72;
  const glintLength = 1.95;
  if (time >= glintStart && time < glintStart + glintLength) {
    const localTime = time - glintStart;
    const progress = localTime / glintLength;
    const frequency = 1200 + progress * 4200;
    const glintEnvelope = Math.pow(1 - progress, 1.7) * Math.min(1, localTime * 65);
    const glint = Math.sin(2 * Math.PI * frequency * localTime)
      + Math.sin(2 * Math.PI * frequency * 2.01 * localTime) * 0.22;
    const pan = -0.75 + progress * 1.5;
    add(index, glint * glintEnvelope, pan, 0.075);
  }

  // Very quiet filtered air gives the tail a little scale without masking the tones.
  filteredNoise = filteredNoise * 0.95 + (random() * 2 - 1) * 0.05;
  if (time >= 1.9) {
    const tailEnvelope = Math.exp(-(time - 1.9) * 1.45);
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
  new URL('../assets/audio/sector-transition-victory-joyful.wav', import.meta.url).pathname,
);
fs.writeFileSync(outputPath, output);
console.log(`Created ${outputPath} (${duration.toFixed(2)}s, ${sampleRate}Hz stereo)`);