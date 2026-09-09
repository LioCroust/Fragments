import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frameSize = 128;
const frameCount = 8;
const outputPath = path.resolve(
  new URL('../assets/images/ship-smoke-sprite-sheet.png', import.meta.url).pathname,
);
const svgPath = path.resolve('/tmp/fragments-neon-ship-smoke-sprite.svg');

const frameMarkup = Array.from({ length: frameCount }, (_, frame) => {
  const x = frame * frameSize;
  const pulse = Math.sin((frame / frameCount) * Math.PI * 2);
  const drift = pulse * 5;
  const curl = Math.cos((frame / frameCount) * Math.PI * 2) * 4;
  return `
    <g transform="translate(${x} 0)">
      <path d="M ${60 + drift} 25 C ${47 + curl} 42, ${75 - curl} 51, ${54 + drift} 67 C ${37 + curl} 80, ${79 - curl} 89, ${51 + drift} 118 C ${67 + curl} 102, ${39 - curl} 91, ${68 + drift} 73 C ${87 - curl} 59, ${45 + curl} 43, ${60 + drift} 25 Z" fill="url(#smokeBody)" opacity="0.42" filter="url(#softBlur)"/>
      <path d="M ${63 + drift} 30 C ${48 + curl} 47, ${74 - curl} 56, ${57 + drift} 73 C ${43 + curl} 87, ${73 - curl} 97, ${61 + drift} 116" fill="none" stroke="#9aa5aa" stroke-width="13" stroke-linecap="round" opacity="0.2" filter="url(#lineGlow)"/>
      <path d="M ${56 - drift} 35 C ${70 - curl} 51, ${43 + curl} 62, ${57 - drift} 78 C ${70 + curl} 92, ${44 - curl} 103, ${51 - drift} 114" fill="none" stroke="#68757c" stroke-width="10" stroke-linecap="round" opacity="0.24" filter="url(#lineGlow)"/>
      <path d="M ${66 + pulse} 28 C ${57 + curl} 46, ${78 - curl} 58, ${67 + drift} 75 C ${55 + curl} 94, ${78 - curl} 101, ${69 + drift} 120" fill="none" stroke="#bcc4c7" stroke-width="3.4" stroke-linecap="round" opacity="0.2" filter="url(#lineGlow)"/>
      <path d="M ${45 + drift} 50 C ${35 - curl} 64, ${49 + pulse} 71, ${36 + drift} 87" fill="none" stroke="#879399" stroke-width="2.6" stroke-linecap="round" opacity="0.18" filter="url(#lineGlow)"/>
      <path d="M ${80 - drift} 55 C ${91 + curl} 69, ${77 - pulse} 80, ${91 - drift} 96" fill="none" stroke="#6c7980" stroke-width="2.4" stroke-linecap="round" opacity="0.17" filter="url(#lineGlow)"/>
    </g>
  `;
}).join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${frameSize * frameCount}" height="${frameSize}" viewBox="0 0 ${frameSize * frameCount} ${frameSize}">
  <defs>
    <radialGradient id="smokeGrey">
      <stop offset="0" stop-color="#b9c2c5" stop-opacity="0.42"/>
      <stop offset="0.42" stop-color="#718087" stop-opacity="0.27"/>
      <stop offset="1" stop-color="#253238" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="smokeBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c1c9cb" stop-opacity="0.42"/>
      <stop offset="0.45" stop-color="#7d898e" stop-opacity="0.29"/>
      <stop offset="1" stop-color="#26343a" stop-opacity="0"/>
    </radialGradient>
    <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="coreBlur" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <filter id="lineGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.8"/>
    </filter>
  </defs>
  ${frameMarkup}
</svg>
`;

fs.writeFileSync(svgPath, svg);
execFileSync('magick', ['-background', 'none', svgPath, outputPath], { stdio: 'inherit' });
fs.unlinkSync(svgPath);
console.log(`Created ${outputPath} (${frameCount} frames, ${frameSize}px each)`);