import React from "react";
import "./SingularityBloom.css";

function BloomMark() {
  return (
    <svg
      className="singularity-bloom__sprite"
      viewBox="0 0 560 560"
      role="img"
      aria-labelledby="singularity-title singularity-description"
    >
      <title id="singularity-title">Singularity Bloom</title>
      <desc id="singularity-description">
        A dangerous cosmic bloom with a black singularity, red-orange petals and
        orbiting particles.
      </desc>
      <defs>
        <radialGradient id="bloom-vacuum" cx="50%" cy="45%" r="62%">
          <stop offset="0" stopColor="#00030b" />
          <stop offset="0.54" stopColor="#080b17" />
          <stop offset="0.8" stopColor="#341021" />
          <stop offset="1" stopColor="#ff4d26" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bloom-core" cx="45%" cy="38%" r="70%">
          <stop offset="0" stopColor="#000108" />
          <stop offset="0.64" stopColor="#02040a" />
          <stop offset="0.82" stopColor="#7d1e2b" />
          <stop offset="0.94" stopColor="#ff6e32" />
          <stop offset="1" stopColor="#ff6e32" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="petal-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb04b" />
          <stop offset="0.31" stopColor="#ff5a2e" />
          <stop offset="0.78" stopColor="#ba1838" />
          <stop offset="1" stopColor="#41153b" />
        </linearGradient>
        <linearGradient id="petal-violet" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2f194d" />
          <stop offset="0.46" stopColor="#b52f5a" />
          <stop offset="1" stopColor="#ff7946" />
        </linearGradient>
        <linearGradient id="edge-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#69f5e7" stopOpacity="0" />
          <stop offset="0.45" stopColor="#69f5e7" />
          <stop offset="1" stopColor="#9a6bff" stopOpacity="0" />
        </linearGradient>
        <filter id="bloom-hot" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bloom-soft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="bloom-particle" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" result="pblur" />
          <feMerge>
            <feMergeNode in="pblur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="bloom-orbit bloom-orbit--outer" fill="none">
        <ellipse cx="280" cy="280" rx="220" ry="88" transform="rotate(-30 280 280)" />
        <ellipse cx="280" cy="280" rx="204" ry="72" transform="rotate(47 280 280)" />
      </g>
      <g className="bloom-dust" filter="url(#bloom-particle)">
        <circle cx="82" cy="183" r="3" />
        <circle cx="123" cy="112" r="2.5" />
        <circle cx="183" cy="68" r="4" />
        <circle cx="403" cy="102" r="3" />
        <circle cx="480" cy="227" r="2.5" />
        <circle cx="454" cy="382" r="4" />
        <circle cx="370" cy="477" r="2.5" />
        <circle cx="170" cy="454" r="3" />
        <circle cx="74" cy="354" r="2" />
      </g>

      <g className="bloom-petals" filter="url(#bloom-soft)" opacity=".5">
        <path d="M280 275 C193 215 139 167 162 116 C219 139 270 175 280 241Z" fill="#ff3c2f" />
        <path d="M298 277 C349 192 397 145 445 163 C430 225 383 271 320 291Z" fill="#ff542b" />
        <path d="M294 297 C378 331 415 381 390 430 C327 416 294 375 279 314Z" fill="#d82b50" />
        <path d="M264 293 C205 365 159 391 119 356 C151 303 196 276 246 267Z" fill="#8f2f88" />
      </g>

      <g className="bloom-petals bloom-petals--sharp">
        <path className="bloom-petal bloom-petal--one" d="M269 272 C217 227 155 196 141 139 C196 146 253 182 284 241 L280 281Z" fill="url(#petal-red)" />
        <path className="bloom-petal bloom-petal--two" d="M287 263 C299 196 329 131 383 102 C389 157 362 224 317 276 L292 286Z" fill="url(#petal-violet)" />
        <path className="bloom-petal bloom-petal--three" d="M306 282 C369 251 432 253 472 291 C429 331 365 331 304 306Z" fill="url(#petal-red)" />
        <path className="bloom-petal bloom-petal--four" d="M298 305 C348 346 359 409 335 458 C286 429 266 369 279 315Z" fill="url(#petal-violet)" />
        <path className="bloom-petal bloom-petal--five" d="M267 309 C246 374 202 418 145 418 C150 361 190 316 250 287Z" fill="url(#petal-red)" />
        <path className="bloom-petal bloom-petal--six" d="M254 286 C188 303 126 281 93 235 C145 208 209 227 266 265Z" fill="url(#petal-violet)" />
      </g>

      <g className="bloom-ribbons" fill="none" strokeLinecap="round">
        <path d="M111 221 C176 187 227 203 268 256" stroke="url(#edge-cyan)" strokeWidth="3" />
        <path d="M300 254 C345 197 405 187 450 213" stroke="#ffb34e" strokeOpacity=".72" strokeWidth="2" />
        <path d="M315 314 C341 357 329 402 300 433" stroke="url(#edge-cyan)" strokeWidth="3" />
        <path d="M244 311 C213 352 175 364 133 352" stroke="#ff7340" strokeOpacity=".7" strokeWidth="2" />
      </g>

      <g className="bloom-ring bloom-ring--charge" fill="none">
        <circle cx="280" cy="280" r="126" stroke="#ff5632" strokeWidth="3" strokeDasharray="10 17" />
        <circle cx="280" cy="280" r="141" stroke="#6cf4e8" strokeWidth="1.5" strokeDasharray="2 26" />
      </g>
      <circle className="bloom-halo" cx="280" cy="280" r="115" fill="url(#bloom-vacuum)" />
      <circle className="bloom-core" cx="280" cy="280" r="89" fill="url(#bloom-core)" />
      <circle className="bloom-core__edge" cx="280" cy="280" r="86" fill="none" stroke="#ff6332" strokeWidth="4" strokeDasharray="22 16 4 11" />
      <circle className="bloom-core__inner" cx="280" cy="280" r="59" fill="#010207" stroke="#ffb554" strokeOpacity=".6" strokeWidth="2" />
      <ellipse className="bloom-lens" cx="261" cy="253" rx="31" ry="16" fill="#070a12" opacity=".8" />
      <circle className="bloom-singularity" cx="280" cy="280" r="36" fill="#000108" />
      <circle className="bloom-singularity__rim" cx="280" cy="280" r="39" fill="none" stroke="#ff452d" strokeWidth="3" strokeDasharray="2 8" />
      <g className="bloom-flare">
        <path d="M280 211 L288 267 L349 280 L288 293 L280 349 L272 293 L211 280 L272 267Z" fill="#ffcc71" opacity=".78" />
        <circle cx="280" cy="280" r="7" fill="#ffe4a5" />
      </g>
      <g className="bloom-particles bloom-particles--near" filter="url(#bloom-hot)">
        <circle cx="195" cy="234" r="4" fill="#ff8a39" />
        <circle cx="360" cy="242" r="3" fill="#6cf4e8" />
        <circle cx="340" cy="345" r="4" fill="#ff4d32" />
        <circle cx="208" cy="340" r="3" fill="#bb76ff" />
      </g>
    </svg>
  );
}

export default function SingularityBloom() {
  return (
    <main className="singularity-bloom" aria-label="Fragments Neon Singularity Bloom bomb concept">
      <div className="singularity-bloom__starfield" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <header className="singularity-bloom__header">
        <div className="singularity-bloom__eyebrow">
          <span className="singularity-bloom__sigil" aria-hidden="true"><b /><b /><b /></span>
          FRAGMENTS / NEON <em>—</em> BOMB ARCHIVE
        </div>
        <div className="singularity-bloom__index">SPECIMEN 04 <span>•</span> LIVE STUDY</div>
      </header>

      <section className="singularity-bloom__concept">
        <div className="singularity-bloom__copy">
          <div className="singularity-bloom__danger">
            <span className="singularity-bloom__danger-dot" /> HAZARD / VOID BLOOM
          </div>
          <h1>Singularity<br /><strong>Bloom</strong></h1>
          <p className="singularity-bloom__lede">
            Une fleur gravitationnelle qui aspire la lumière avant de se contracter.
            Sa respiration signale le danger une fraction de seconde avant l&apos;impact.
          </p>
          <div className="singularity-bloom__rule" />
          <p className="singularity-bloom__caption">
            <span>SIGNAL VISUEL</span>
            Effondrement radial · charge en 6 pétales · noyau impossible à toucher
          </p>
        </div>

        <div className="singularity-bloom__stage">
          <div className="singularity-bloom__stage-label"><span>ENERGY CYCLE</span><strong>CONTRACTION / 06</strong></div>
          <BloomMark />
          <div className="singularity-bloom__scanline" aria-hidden="true" />
          <div className="singularity-bloom__stage-foot">
            <span>ORBITAL PRESSURE</span>
            <span className="singularity-bloom__meter"><i /><i /><i /><i /><i /><i /></span>
            <strong>89%</strong>
          </div>
        </div>
      </section>

      <footer className="singularity-bloom__footer">
        <span>RED / ORANGE = ACTIVE THREAT</span>
        <span className="singularity-bloom__footer-line" />
        <span>SAFE ZONE PURGE ENABLED</span>
      </footer>
    </main>
  );
}