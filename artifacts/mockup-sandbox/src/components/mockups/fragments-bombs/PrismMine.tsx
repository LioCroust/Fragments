import React from "react";
import "./PrismMine.css";

function PrismMineSprite() {
  return (
    <svg
      className="prism-mine__svg"
      viewBox="0 0 540 540"
      role="img"
      aria-label="Animated prism mine with rotating blades and charging red reactor"
    >
      <defs>
        <radialGradient id="prism-core" cx="44%" cy="38%" r="64%">
          <stop offset="0" stopColor="#fff0bd" />
          <stop offset="0.16" stopColor="#ffbf64" />
          <stop offset="0.42" stopColor="#ff553d" />
          <stop offset="0.75" stopColor="#a40e2c" />
          <stop offset="1" stopColor="#260b1e" />
        </radialGradient>
        <linearGradient id="prism-face-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4d596e" />
          <stop offset="0.34" stopColor="#182133" />
          <stop offset="0.78" stopColor="#0b1020" />
          <stop offset="1" stopColor="#ff443f" />
        </linearGradient>
        <linearGradient id="prism-face-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#11182a" />
          <stop offset="0.63" stopColor="#202c43" />
          <stop offset="1" stopColor="#735eac" />
        </linearGradient>
        <linearGradient id="prism-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#61f5ee" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#ff7860" />
          <stop offset="1" stopColor="#a68cff" stopOpacity="0.38" />
        </linearGradient>
        <filter id="prism-glow-red" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="prism-glow-cyan" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g className="prism-mine__orbit prism-mine__orbit--slow" fill="none" strokeLinecap="round">
        <ellipse cx="270" cy="270" rx="201" ry="112" stroke="#6ff5ef" strokeOpacity="0.2" strokeWidth="1" transform="rotate(29 270 270)" />
        <ellipse cx="270" cy="270" rx="184" ry="98" stroke="#a68cff" strokeOpacity="0.36" strokeWidth="2" strokeDasharray="2 16" transform="rotate(-35 270 270)" />
        <path d="M83 211c35-80 123-122 206-111" stroke="#6ff5ef" strokeOpacity="0.56" strokeWidth="2" strokeDasharray="1 9" />
        <path d="M254 394c69 8 136-19 179-71" stroke="#ff7c36" strokeOpacity="0.75" strokeWidth="2" strokeDasharray="1 11" />
      </g>

      <g className="prism-mine__orbit prism-mine__orbit--counter" fill="none">
        <ellipse cx="270" cy="270" rx="168" ry="210" stroke="url(#prism-edge)" strokeOpacity="0.7" strokeWidth="1" transform="rotate(42 270 270)" />
        <circle cx="270" cy="270" r="192" stroke="#ff3d42" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 17" />
      </g>

      <g className="prism-mine__charge prism-mine__charge--a" fill="none" stroke="#ff3d42" strokeWidth="4" strokeLinecap="round">
        <path d="M270 63a207 207 0 0 1 178 101" />
        <path d="M96 376a207 207 0 0 1-24-103" />
      </g>
      <g className="prism-mine__charge prism-mine__charge--b" fill="none" stroke="#ff7c36" strokeWidth="3" strokeLinecap="round">
        <path d="M384 407a207 207 0 0 1-111 37" />
        <path d="M166 93a207 207 0 0 1 69-25" />
      </g>

      <g aria-hidden="true">
        <circle cx="270" cy="270" r="126" fill="#070b17" stroke="#2c3a51" strokeWidth="4" />
        <circle cx="270" cy="270" r="116" fill="none" stroke="#6ff5ef" strokeOpacity="0.27" strokeWidth="1" strokeDasharray="1 8" />
        <circle cx="270" cy="270" r="103" fill="none" stroke="#ff3d42" strokeOpacity="0.47" strokeWidth="2" strokeDasharray="5 13" />
      </g>

      <g className="prism-mine__blade" aria-hidden="true">
        <path d="M270 151 301 213 270 247 239 213Z" fill="url(#prism-face-a)" stroke="#778aa6" strokeOpacity="0.78" strokeWidth="2" />
        <path d="M270 151 301 213 270 199Z" fill="#ff3d42" fillOpacity="0.47" />
      </g>
      <g className="prism-mine__blade" aria-hidden="true">
        <path d="m389 270-62 31-34-31 34-31Z" fill="url(#prism-face-b)" stroke="#778aa6" strokeOpacity="0.78" strokeWidth="2" />
        <path d="m389 270-62 31 14-31Z" fill="#6ff5ef" fillOpacity="0.34" />
      </g>
      <g className="prism-mine__blade" aria-hidden="true">
        <path d="m270 389-31-62 31-34 31 34Z" fill="url(#prism-face-a)" stroke="#778aa6" strokeOpacity="0.78" strokeWidth="2" />
        <path d="m270 389-31-62 31 14Z" fill="#ff7c36" fillOpacity="0.52" />
      </g>
      <g className="prism-mine__blade" aria-hidden="true">
        <path d="m151 270 62-31 34 31-34 31Z" fill="url(#prism-face-b)" stroke="#778aa6" strokeOpacity="0.78" strokeWidth="2" />
        <path d="m151 270 62-31-14 31Z" fill="#a68cff" fillOpacity="0.5" />
      </g>

      <g className="prism-mine__core" filter="url(#prism-glow-red)">
        <path d="m270 193 57 34v86l-57 34-57-34v-86Z" fill="url(#prism-core)" stroke="#ffb15e" strokeWidth="2" />
        <path d="m270 193 57 34-57 34-57-34Z" fill="#ffdb8a" fillOpacity="0.34" />
        <path d="M270 261v86l57-34v-86Z" fill="#7e1029" fillOpacity="0.78" />
        <path d="M270 261v86l-57-34v-86Z" fill="#ff3d42" fillOpacity="0.25" />
        <circle cx="270" cy="260" r="18" fill="#fff1c7" fillOpacity="0.8" />
      </g>

      <g className="prism-mine__target" fill="none" stroke="#ffbaa1" strokeWidth="2" filter="url(#prism-glow-red)">
        <circle cx="270" cy="270" r="65" strokeDasharray="1 8" />
        <path d="M270 192v19M270 329v19M192 270h19M329 270h19" />
      </g>

      <g className="prism-mine__fragment" filter="url(#prism-glow-cyan)">
        <path d="m105 142 10-17 11 14-8 16Z" fill="#6ff5ef" />
        <path d="m419 143 16-8 3 19-14 8Z" fill="#a68cff" />
        <path d="m116 390 15 5-7 18-14-11Z" fill="#ff7c36" />
        <path d="m405 391 18-9 2 17-16 10Z" fill="#ff3d42" />
      </g>
    </svg>
  );
}

export default function PrismMine() {
  return (
    <main className="prism-mine-concept" aria-label="Fragments Neon prism mine concept">
      <div className="prism-mine-concept__shell">
        <header className="prism-mine-concept__masthead">
          <p className="prism-mine-concept__kicker">FRAGMENTS / NEON &nbsp;—&nbsp; HAZARD STUDY</p>
          <p className="prism-mine-concept__index">BOMB DESIGN<strong>04 / PRISM MINE</strong></p>
        </header>

        <section className="prism-mine-concept__body">
          <div className="prism-mine-concept__visual">
            <PrismMineSprite />
          </div>

          <div className="prism-mine-concept__details">
            <div className="prism-mine-concept__danger"><i aria-hidden="true" /> DANGER / TARGET LOCK</div>
            <h1 className="prism-mine-concept__title"><em>Variant 04</em>Prism<br />Mine</h1>
            <p className="prism-mine-concept__lede">
              Une mine angulaire à facettes verrouille sa cible par salves : les lames orbitent, le cœur sature, puis le signal rouge frappe.
            </p>
            <div className="prism-mine-concept__signal" aria-label="Danger signal: charge by segments, rapid flash on lock">
              <p className="prism-mine-concept__signal-label">SIGNAL VISUEL / CHARGE PAR SEGMENTS</p>
              <p className="prism-mine-concept__signal-status">ARMED</p>
              <div className="prism-mine-concept__signal-bar" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </div>
        </section>

        <footer className="prism-mine-concept__footer">
          <p>SILHOUETTE ANGULAIRE / LAMES ORBITALES / NOYAU INCANDESCENT</p>
          <p>RED = THREAT &nbsp;·&nbsp; CYAN = SECONDARY ENERGY</p>
        </footer>
      </div>
    </main>
  );
}