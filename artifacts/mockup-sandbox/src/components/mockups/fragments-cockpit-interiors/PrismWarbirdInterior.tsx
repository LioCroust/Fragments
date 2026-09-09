import React from "react";
import "./PrismWarbirdInterior.css";

type ReadoutProps = {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  meta: string;
  ariaLabel: string;
};

function Readout({ className, label, value, suffix, meta, ariaLabel }: ReadoutProps) {
  return (
    <article className={`prism-warbird__readout ${className}`} aria-label={ariaLabel}>
      <span className="prism-warbird__label">{label}</span>
      <strong className="prism-warbird__value">
        {value}
        {suffix && <em>{suffix}</em>}
      </strong>
      <small className="prism-warbird__meta">{meta}</small>
    </article>
  );
}

export default function PrismWarbirdInterior() {
  return (
    <main className="prism-warbird" aria-label="Fragments Neon Prism Warbird cockpit interior">
      <section className="prism-warbird__stage" aria-label="Faceted pilot instrument panel">
        <img
          className="prism-warbird__shell"
          src="/__mockup/images/prism-warbird-interior-goldframes.png?v=goldframes-01"
          alt="Painted blackened steel and copper spacecraft cockpit interior viewed from the pilot seat"
        />
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
        />
        <Readout
          className="prism-warbird__readout--zone"
          label="ZONE"
          value="27"
          suffix=" / 80"
          meta="CUT DEPTH"
          ariaLabel="Zone 27 out of 80"
        />
      </section>
    </main>
  );
}