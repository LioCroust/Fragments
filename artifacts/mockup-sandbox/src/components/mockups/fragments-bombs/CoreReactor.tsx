import React from "react";
import "./CoreReactor.css";

export default function CoreReactor() {
  return (
    <main className="core-reactor-preview" aria-label="Fragments Neon Core Reactor bomb concept">
      <div className="core-reactor-preview__stars" aria-hidden="true" />
      <div className="core-reactor-preview__scanline" aria-hidden="true" />

      <header className="core-reactor-preview__header">
        <div className="core-reactor-preview__eyebrow">
          <span className="core-reactor-preview__status-dot" />
          FRAGMENTS / NEON
          <span className="core-reactor-preview__divider" />
          BOMB CONCEPT 04
        </div>
        <div className="core-reactor-preview__badge">
          <span className="core-reactor-preview__badge-icon">!</span>
          <span>
            <b>DANGER</b>
            <small>unstable core</small>
          </span>
        </div>
      </header>

      <section className="core-reactor-preview__stage" aria-label="Animated Core Reactor sprite">
        <div className="core-reactor-preview__reticle core-reactor-preview__reticle--top" aria-hidden="true">
          <span />
        </div>
        <div className="core-reactor-preview__reticle core-reactor-preview__reticle--bottom" aria-hidden="true">
          <span />
        </div>
        <div className="core-reactor-preview__orbit orbit-a" aria-hidden="true" />
        <div className="core-reactor-preview__orbit orbit-b" aria-hidden="true" />

        <svg
          className="core-reactor"
          viewBox="0 0 520 520"
          role="img"
          aria-labelledby="core-reactor-title core-reactor-description"
        >
          <title id="core-reactor-title">Core Reactor</title>
          <desc id="core-reactor-description">
            A spherical armored bomb with rotating mechanical rings and a pulsing red warning core.
          </desc>
          <defs>
            <radialGradient id="reactor-body" cx="34%" cy="27%" r="76%">
              <stop offset="0%" stopColor="#405064" />
              <stop offset="42%" stopColor="#151c28" />
              <stop offset="82%" stopColor="#080d16" />
              <stop offset="100%" stopColor="#03060c" />
            </radialGradient>
            <radialGradient id="reactor-core" cx="38%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffd08a" />
              <stop offset="20%" stopColor="#ff8c43" />
              <stop offset="52%" stopColor="#f13a2f" />
              <stop offset="100%" stopColor="#6b0f20" />
            </radialGradient>
            <linearGradient id="reactor-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a9c8d6" />
              <stop offset="26%" stopColor="#3f5366" />
              <stop offset="55%" stopColor="#0a101b" />
              <stop offset="76%" stopColor="#d05b3b" />
              <stop offset="100%" stopColor="#242c3d" />
            </linearGradient>
            <linearGradient id="reactor-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#46d4db" stopOpacity="0" />
              <stop offset="50%" stopColor="#8df9ec" />
              <stop offset="100%" stopColor="#46d4db" stopOpacity="0" />
            </linearGradient>
            <filter id="red-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="core-reactor__halo" aria-hidden="true">
            <circle cx="260" cy="260" r="204" fill="#ee3b32" opacity=".055" />
            <circle cx="260" cy="260" r="182" fill="none" stroke="#ee3b32" strokeWidth="1" opacity=".3" strokeDasharray="2 13" />
          </g>

          <g className="core-reactor__outer-ring" aria-hidden="true">
            <circle cx="260" cy="260" r="190" fill="none" stroke="#050a12" strokeWidth="18" />
            <circle cx="260" cy="260" r="184" fill="none" stroke="url(#reactor-ring)" strokeWidth="6" strokeDasharray="90 18 14 10" />
            <circle cx="260" cy="260" r="172" fill="none" stroke="#617487" strokeWidth="1" opacity=".72" strokeDasharray="34 8 4 10" />
            <path d="M260 61v28M260 431v28M61 260h28M431 260h28" stroke="#f36d40" strokeWidth="4" strokeLinecap="square" />
            <path d="M118 118l18 18M384 118l-18 18M118 402l18-18M384 402l-18-18" stroke="#58d9db" strokeWidth="2" opacity=".9" />
          </g>

          <g className="core-reactor__middle-ring" aria-hidden="true">
            <ellipse cx="260" cy="260" rx="149" ry="75" fill="none" stroke="#111b29" strokeWidth="18" />
            <ellipse cx="260" cy="260" rx="149" ry="75" fill="none" stroke="url(#reactor-ring)" strokeWidth="4" strokeDasharray="56 16 10 25" />
            <ellipse cx="260" cy="260" rx="142" ry="68" fill="none" stroke="#8d3a41" strokeWidth="1" opacity=".9" strokeDasharray="4 8" />
            <path d="M111 260h35M374 260h35" stroke="#f27d49" strokeWidth="6" strokeLinecap="square" />
            <path d="M260 185v-29M260 394v-29" stroke="#67d9dc" strokeWidth="3" />
          </g>

          <g className="core-reactor__armor">
            <circle cx="260" cy="260" r="130" fill="url(#reactor-body)" stroke="#263647" strokeWidth="4" />
            <path d="M174 168c30-30 67-43 110-40 37 2 69 15 94 42" fill="none" stroke="#70879a" strokeWidth="3" opacity=".38" />
            <path d="M153 309c12 45 46 77 91 88 49 12 98-1 130-35" fill="none" stroke="#02050a" strokeWidth="12" opacity=".7" />
            <path d="M164 195l22-17 12 13M356 195l-22-17-12 13M164 325l22 17 12-13M356 325l-22 17-12-13" fill="none" stroke="#a54a3c" strokeWidth="4" />
            <circle cx="170" cy="260" r="8" fill="#101a28" stroke="#7ee3e0" strokeWidth="2" />
            <circle cx="350" cy="260" r="8" fill="#101a28" stroke="#7ee3e0" strokeWidth="2" />
            <circle cx="260" cy="155" r="7" fill="#111b28" stroke="#ec7650" strokeWidth="3" />
            <circle cx="260" cy="365" r="7" fill="#111b28" stroke="#ec7650" strokeWidth="3" />
          </g>

          <g className="core-reactor__inner-ring" aria-hidden="true">
            <circle cx="260" cy="260" r="95" fill="#090e18" stroke="#38495d" strokeWidth="4" />
            <circle cx="260" cy="260" r="83" fill="none" stroke="#d64c39" strokeWidth="5" strokeDasharray="13 7" />
            <circle cx="260" cy="260" r="72" fill="none" stroke="#f39157" strokeWidth="1" opacity=".85" strokeDasharray="3 6" />
          </g>

          <g className="core-reactor__core" filter="url(#red-glow)">
            <circle cx="260" cy="260" r="57" fill="#681225" opacity=".78" />
            <circle cx="260" cy="260" r="46" fill="url(#reactor-core)" stroke="#ff9f5b" strokeWidth="3" />
            <circle cx="246" cy="244" r="13" fill="#ffe7ae" opacity=".62" />
            <circle cx="260" cy="260" r="33" fill="none" stroke="#ffcf76" strokeWidth="2" opacity=".65" strokeDasharray="3 7" />
          </g>

          <g className="core-reactor__charge" aria-hidden="true">
            <path d="M260 106v18M318 117l-7 17M367 149l-13 13M403 198l-17 7M414 260h-18M403 322l-17-7M367 371l-13-13M318 403l-7-17M260 414v-18M202 403l7-17M153 371l13-13M117 322l17-7M106 260h18M117 198l17 7M153 149l13 13M202 117l7 17" stroke="#f07d48" strokeWidth="5" strokeLinecap="round" />
          </g>

          <g className="core-reactor__signal" filter="url(#soft-glow)" aria-hidden="true">
            <path d="M168 260h184" stroke="url(#reactor-cyan)" strokeWidth="2" opacity=".75" />
            <path d="M260 168v184" stroke="url(#reactor-cyan)" strokeWidth="2" opacity=".55" />
          </g>
        </svg>

        <div className="core-reactor-preview__readout core-reactor-preview__readout--left" aria-hidden="true">
          <span>CORE LOAD</span>
          <b>87.4</b>
          <i><em /><em /><em /><em /><em /><em /><em /></i>
        </div>
        <div className="core-reactor-preview__readout core-reactor-preview__readout--right" aria-hidden="true">
          <span>SAFE DISTANCE</span>
          <b>0.8 <small>u</small></b>
          <i />
        </div>
      </section>

      <footer className="core-reactor-preview__footer">
        <div>
          <p className="core-reactor-preview__kicker">CORE REACTOR</p>
          <h1>Instable.<br /><span>À ne pas toucher.</span></h1>
        </div>
        <div className="core-reactor-preview__description">
          <span className="core-reactor-preview__line" />
          <p>Une coque blindée concentrique contient un cœur rouge qui pulse comme un compte à rebours. Le signal de charge reste lisible avant même le contact.</p>
        </div>
      </footer>
    </main>
  );
}