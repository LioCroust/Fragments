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
      <ellipse cx="${64 + drift}" cy="${73 + pulse * 2}" rx="${26 + pulse * 2}" ry="${18 - pulse}" fill="url(#cloudCyan)" opacity="0.34" filter="url(#softBlur)"/>
      <ellipse cx="${60 + curl}" cy="${79 - pulse * 2}" rx="${22 - pulse}" ry="${14 + pulse * 2}" fill="url(#cloudMagenta)" opacity="0.27" filter="url(#softBlur)"/>
      <ellipse cx="${64 + drift}" cy="${70 + pulse}" rx="11" ry="9" fill="url(#core)" opacity="0.72" filter="url(#coreBlur)"/>
      <path d="M ${66 + drift} 88 C ${42 + curl} 101, ${42 - curl} 66, ${25 + drift} 58 C ${41 + curl} 67, ${48 - curl} 91, ${29 + drift} 105" fill="none" stroke="#00f3ff" stroke-width="3.2" stroke-linecap="round" opacity="0.72" filter="url(#lineGlow)"/>
      <path d="M ${61 - drift} 86 C ${83 - curl} 96, ${85 + curl} 65, ${105 - drift} 55 C ${88 - curl} 68, ${80 + curl} 88, ${100 - drift} 103" fill="none" stroke="#ff2bb5" stroke-width="2.8" stroke-linecap="round" opacity="0.61" filter="url(#lineGlow)"/>
      <path d="M ${64 + pulse} 88 C ${55 + curl} 105, ${72 - curl} 108, ${64 + drift} 119" fill="none" stroke="#b8ff4a" stroke-width="2" stroke-linecap="round" opacity="0.52" filter="url(#lineGlow)"/>
      <path d="M ${57 + drift} 78 C ${46 - curl} 72, ${43 + pulse} 56, ${52 + drift} 44" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.56"/>
      <circle cx="${52 + drift}" cy="${55 + pulse}" r="2.5" fill="#ffffff" opacity="0.72"/>
      <circle cx="${82 - curl}" cy="${67 - pulse}" r="1.8" fill="#00f3ff" opacity="0.78"/>
      <circle cx="${40 + drift}" cy="${91 + pulse}" r="1.6" fill="#ff2bb5" opacity="0.68"/>
    </g>
  `;
}).join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${frameSize * frameCount}" height="${frameSize}" viewBox="0 0 ${frameSize * frameCount} ${frameSize}">
  <defs>
    <radialGradient id="cloudCyan">
      <stop offset="0" stop-color="#eaffff" stop-opacity="0.92"/>
      <stop offset="0.24" stop-color="#00f3ff" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#00f3ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cloudMagenta">
      <stop offset="0" stop-color="#fff0fb" stop-opacity="0.8"/>
      <stop offset="0.3" stop-color="#ff2bb5" stop-opacity="0.52"/>
      <stop offset="1" stop-color="#ff2bb5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.28" stop-color="#b8ff4a" stop-opacity="0.62"/>
      <stop offset="0.7" stop-color="#00f3ff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#00f3ff" stop-opacity="0"/>
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