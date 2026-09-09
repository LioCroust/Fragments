import React from "react";
import "./PrismWarbirdInterior.css";

type ReadoutProps = {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  meta: string;
  ariaLabel: string;
  shieldCount?: number;
};

function Readout({ className, label, value, suffix, meta, ariaLabel, shieldCount }: ReadoutProps) {
  return (
    <article className={`prism-warbird__readout ${className}`} aria-label={ariaLabel}>
      <div className="prism-warbird__readout-head">
        <span className="prism-warbird__label">{label}</span>
        <span className="prism-warbird__status-dot" aria-hidden="true" />
      </div>
      <strong className="prism-warbird__value">
        {value}
        {suffix && <em>{suffix}</em>}
      </strong>
      <small className="prism-warbird__meta">{meta}</small>
      {typeof shieldCount === "number" && (
        <div
          className="prism-warbird__shield-meter"
          role="meter"
          aria-label={`${shieldCount} boucliers actifs sur 3`}
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={shieldCount}
        >
          {Array.from({ length: 3 }, (_, index) => (
            <i key={index} className={index < shieldCount ? "is-live" : ""} />
          ))}
        </div>
      )}
    </article>
  );
}

export default function PrismWarbirdInterior() {
  const zoneValue = 27;
  const zoneMax = 80;
  const zoneProgress = (zoneValue / zoneMax) * 100;

  return (
    <main className="prism-warbird" aria-label="Fragments Neon Prism Warbird cockpit interior">
      <section className="prism-warbird__stage" aria-label="Faceted pilot instrument panel">
        <img
          className="prism-warbird__shell"
          src="/__mockup/images/prism-warbird-interior-neon-console.png?v=neon-console-01"
          alt="Painted blackened steel and copper spacecraft cockpit interior with rectangular gauges, signal lamps and colorful instrument rails viewed from the pilot seat"
        />
        <div className="prism-warbird__signal-bank prism-warbird__signal-bank--left" aria-label="Left instrument signal bank">
          <span className="prism-warbird__signal-title">PORT / LIVE</span>
          <i className="prism-warbird__signal prism-warbird__signal--cyan" />
          <i className="prism-warbird__signal prism-warbird__signal--lime" />
          <i className="prism-warbird__signal prism-warbird__signal--amber" />
          <i className="prism-warbird__signal prism-warbird__signal--magenta" />
          <i className="prism-warbird__signal prism-warbird__signal--cyan" />
        </div>
        <div className="prism-warbird__signal-bank prism-warbird__signal-bank--right" aria-label="Right instrument signal bank">
          <span className="prism-warbird__signal-title">STARBOARD / LIVE</span>
          <i className="prism-warbird__signal prism-warbird__signal--amber" />
          <i className="prism-warbird__signal prism-warbird__signal--cyan" />
          <i className="prism-warbird__signal prism-warbird__signal--lime" />
          <i className="prism-warbird__signal prism-warbird__signal--amber" />
          <i className="prism-warbird__signal prism-warbird__signal--magenta" />
        </div>
        <div className="prism-warbird__top-rail" aria-hidden="true">
          <span>REACTOR</span>
          <b />
          <b />
          <b />
          <b />
          <b />
          <span>FLIGHT SYSTEMS</span>
        </div>
        <Readout
          className="prism-warbird__readout--score"
          label="SCORE"
          value="047 280"
          meta="COMBAT INDEX"
          ariaLabel="Score 47,280"
        />
        <Readout
          className="prism-warbird__readout--sector"
          label="SECTEUR"
          value="04"
          meta="VECTOR / 04"
          ariaLabel="Sector 04"
        />
        <Readout
          className="prism-warbird__readout--shields"
          label="BOUCLIERS"
          value="3"
          meta="ARMOR LOCK"
          ariaLabel="Three shields"
          shieldCount={3}
        />
        <Readout
          className="prism-warbird__readout--zone"
          label="ZONE"
          value="27"
          suffix=" / 80"
          meta="CUT DEPTH"
          ariaLabel={`Zone ${zoneValue} out of ${zoneMax}`}
        />
        <div
          className="prism-warbird__zone-progress"
          role="progressbar"
          aria-label={`Zone sécurisée ${zoneValue} sur ${zoneMax}`}
          aria-valuemin={0}
          aria-valuemax={zoneMax}
          aria-valuenow={zoneValue}
        >
          <span style={{ width: `${zoneProgress}%` }} />
        </div>
      </section>
    </main>
  );
}