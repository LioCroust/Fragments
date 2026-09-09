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
      <ellipse cx="${64 + drift}" cy="${74 + pulse * 2}" rx="${27 + pulse * 2}" ry="${17 - pulse}" fill="url(#smokeGrey)" opacity="0.26" filter="url(#softBlur)"/>
      <ellipse cx="${57 + curl}" cy="${84 - pulse * 2}" rx="${20 - pulse}" ry="${12 + pulse * 2}" fill="#111a20" opacity="0.34" filter="url(#softBlur)"/>
      <ellipse cx="${76 - curl}" cy="${63 + pulse}" rx="17" ry="11" fill="#29343b" opacity="0.23" filter="url(#softBlur)"/>
      <path d="M ${67 + drift} 90 C ${48 + curl} 101, ${43 - curl} 78, ${29 + drift} 71 C ${43 + curl} 78, ${49 - curl} 94, ${36 + drift} 108" fill="none" stroke="#65727a" stroke-width="3.8" stroke-linecap="round" opacity="0.18" filter="url(#lineGlow)"/>
      <path d="M ${59 - drift} 87 C ${78 - curl} 98, ${88 + curl} 77, ${103 - drift} 68 C ${88 - curl} 80, ${80 + curl} 96, ${94 - drift} 108" fill="none" stroke="#879198" stroke-width="3.1" stroke-linecap="round" opacity="0.13" filter="url(#lineGlow)"/>
      <path d="M ${66 + pulse} 88 C ${58 + curl} 102, ${70 - curl} 110, ${64 + drift} 120" fill="none" stroke="#46535b" stroke-width="4.5" stroke-linecap="round" opacity="0.17" filter="url(#lineGlow)"/>
      <path d="M ${54 + drift} 78 C ${47 - curl} 69, ${49 + pulse} 57, ${59 + drift} 49" fill="none" stroke="#a0a8ad" stroke-width="2.4" stroke-linecap="round" opacity="0.12" filter="url(#lineGlow)"/>
      <circle cx="${47 + drift}" cy="${61 + pulse}" r="3.2" fill="#737e84" opacity="0.13" filter="url(#coreBlur)"/>
      <circle cx="${84 - curl}" cy="${71 - pulse}" r="2.8" fill="#9aa2a6" opacity="0.1" filter="url(#coreBlur)"/>
      <circle cx="${38 + drift}" cy="${94 + pulse}" r="2.2" fill="#556168" opacity="0.12" filter="url(#coreBlur)"/>
    </g>
  `;
}).join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${frameSize * frameCount}" height="${frameSize}" viewBox="0 0 ${frameSize * frameCount} ${frameSize}">
  <defs>
    <radialGradient id="smokeGrey">
      <stop offset="0" stop-color="#a7b0b5" stop-opacity="0.38"/>
      <stop offset="0.42" stop-color="#657179" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#1b252b" stop-opacity="0"/>
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