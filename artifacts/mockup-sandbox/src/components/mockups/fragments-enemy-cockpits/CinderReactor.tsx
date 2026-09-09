import React from "react";
import "./CinderReactor.css";

type TelemetryProps = {
  label: string;
  value: string;
  suffix?: string;
  className: string;
  note?: string;
};

function Telemetry({ label, value, suffix, className, note }: TelemetryProps) {
  return (
    <article className={`cinder-telemetry ${className}`} aria-label={`${label} ${value}${suffix ?? ""}`}>
      <span className="cinder-telemetry__label">{label}</span>
      <strong className="cinder-telemetry__value">
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
      {note && <span className="cinder-telemetry__note">{note}</span>}
      <i className="cinder-telemetry__lamp" aria-hidden="true" />
    </article>
  );
}

export default function CinderReactor() {
  return (
    <main className="cinder-reactor" aria-label="Fragments Neon Cinder Reactor enemy cockpit HUD">
      <section className="cinder-reactor__viewport" aria-label="Horizontal spacecraft cockpit preview">
        <div className="cinder-reactor__header" aria-hidden="true">
          <span>F-05 / CINDER REACTOR</span>
          <span><i /> REACTOR LINKED</span>
        </div>

        <section className="cinder-reactor__craft" aria-label="Cinder Reactor spacecraft telemetry">
          <img
            className="cinder-reactor__shell"
            src="/__mockup/images/cinder-reactor-cockpit.png"
            alt="Painted black-metal enemy spacecraft with broken scarlet reactor armor and a glowing diamond core"
          />

          <div className="cinder-reactor__instrument-rail" aria-hidden="true" />

          <Telemetry
            className="cinder-telemetry--score"
            label="SCORE"
            value="047280"
            note="RUN TOTAL"
          />
          <Telemetry
            className="cinder-telemetry--sector"
            label="SECTEUR"
            value="07"
            note="RING 03"
          />
          <Telemetry
            className="cinder-telemetry--shields"
            label="BOUCLIERS"
            value="3"
            note="ARMOR LINK"
          />
          <Telemetry
            className="cinder-telemetry--zone"
            label="ZONE"
            value="42"
            suffix=" / 80"
            note="CUT DEPTH"
          />

          <div className="cinder-reactor__core-caption" aria-hidden="true">
            <span>CORE TEMP</span>
            <strong>812°</strong>
          </div>
        </section>
      </section>
    </main>
  );
}