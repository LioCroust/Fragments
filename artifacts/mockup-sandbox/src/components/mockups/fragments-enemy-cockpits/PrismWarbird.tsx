import React from "react";
import "./PrismWarbird.css";

const telemetry = [
  { key: "sector", label: "SECTEUR", value: "07", meta: "VECTOR / 03" },
  { key: "score", label: "SCORE", value: "148 260", meta: "COMBAT INDEX" },
  { key: "shields", label: "BOUCLIERS", value: "03", meta: "ARMOR LOCK" },
  { key: "zone", label: "ZONE", value: "42", meta: "/ 80" },
];

export default function PrismWarbird() {
  return (
    <main className="prism-warbird" aria-label="Fragments Neon Prism Warbird cockpit HUD">
      <div className="prism-warbird__topline">
        <span className="prism-warbird__mark">FRAGMENTS NEON <b>/</b> PRISM WAR-BIRD</span>
        <span className="prism-warbird__mission"><i /> MISSION 07 <b>LIVE</b></span>
      </div>

      <section className="prism-warbird__stage" aria-label="Faceted warbird instrument panel">
        <img
          className="prism-warbird__shell"
          src="/__mockup/images/prism-warbird-cockpit.png"
          alt="Faceted ruby-magenta enemy warbird cockpit with armored wings and a central crystal canopy"
        />

        <div className="prism-warbird__telemetry" aria-label="Mission telemetry">
          {telemetry.map((item) => (
            <article className={`warbird-readout warbird-readout--${item.key}`} key={item.key}>
              <span className="warbird-readout__label">{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.meta}</small>
            </article>
          ))}
        </div>

        <div className="prism-warbird__core-status" aria-label="Crystal core status">
          <span className="core-status__tick">CORE</span>
          <span className="core-status__line" />
          <span className="core-status__state">PRISM / STABLE</span>
        </div>
      </section>

      <footer className="prism-warbird__footer">
        <span>THREAT CLASS <b>WAR BIRD // V</b></span>
        <span>ARMOR TEMP <b>684°</b></span>
        <span>CRYSTAL RESONANCE <b>98.4 KHZ</b></span>
      </footer>
    </main>
  );
}