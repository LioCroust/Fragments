import React from "react";
import "./RubyInterceptorInterior.css";

type ReadoutProps = {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  accent?: "ruby" | "orange" | "gold" | "cyan";
};

function Readout({ className, label, value, suffix, accent = "ruby" }: ReadoutProps) {
  return (
    <article className={`ruby-readout ruby-readout--${accent} ${className}`} aria-label={`${label} ${value}${suffix ?? ""}`}>
      <span className="ruby-readout__label">{label}</span>
      <strong>{value}<small>{suffix}</small></strong>
      <i className="ruby-readout__tick" aria-hidden="true" />
    </article>
  );
}

export default function RubyInterceptorInterior() {
  return (
    <main className="ruby-interceptor" aria-label="Fragments Neon Ruby Interceptor cockpit interior">
      <div className="ruby-interceptor__mat">
        <header className="ruby-interceptor__masthead" aria-label="Cockpit status">
          <span>RUBY INTERCEPTOR / PURSUIT DECK</span>
          <span className="ruby-interceptor__live"><i aria-hidden="true" /> FLIGHT SYSTEMS LIVE</span>
        </header>

        <section className="ruby-cockpit" aria-label="Pilot-facing instrument panel">
          <div
            className="ruby-cockpit__art"
            role="img"
            aria-label="Painted tight spacecraft cockpit interior with ruby canopy ribs, targeting glass, side sticks and instrument bays"
          />

          <div className="ruby-targeting-glass" aria-hidden="true">
            <span className="ruby-targeting-glass__reticle" />
            <span className="ruby-targeting-glass__sweep" />
          </div>

          <Readout className="ruby-readout--score-position" label="SCORE" value="048720" accent="orange" />
          <Readout className="ruby-readout--sector-position" label="SECTEUR" value="07" accent="ruby" />
          <Readout className="ruby-readout--shield-position" label="BOUCLIERS" value="3" accent="gold" />
          <Readout className="ruby-readout--zone-position" label="ZONE" value="42" suffix=" / 80" accent="cyan" />

          <div className="ruby-console-lights ruby-console-lights--left" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="ruby-console-lights ruby-console-lights--right" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="ruby-diamond" aria-label="Ruby aiming crystal" role="img" />
          <div className="ruby-reticle-line" aria-hidden="true" />
        </section>

        <footer className="ruby-interceptor__footnote">
          <span>MANUAL PURSUIT CONTROL</span>
          <span>R-09 / TARGETING GLASS CALIBRATED</span>
        </footer>
      </div>
    </main>
  );
}