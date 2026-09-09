import React from "react";
import "./EmberBridge.css";

const telemetry = [
  { className: "ember-readout--score", label: "SCORE", value: "047 280", detail: "RUN / 06", tone: "gold" },
  { className: "ember-readout--sector", label: "SECTEUR", value: "03", detail: "EMBER LINE", tone: "ruby" },
  { className: "ember-readout--shields", label: "BOUCLIERS", value: "3", detail: "■■■", tone: "orange" },
  { className: "ember-readout--zone", label: "ZONE", value: "64", detail: "/ 80", tone: "magenta" },
];

export default function EmberBridge() {
  return (
    <main className="ember-bridge" aria-label="Fragments Neon Interior 01 Ember Bridge cockpit">
      <section className="ember-bridge__preview" aria-label="Pilot view of the Ember Bridge command cockpit">
        <img
          className="ember-bridge__shell"
          src="/__mockup/images/ember-bridge-interior.png"
          alt="Painted interior of a futuristic spacecraft command bridge viewed from the pilot seat"
        />

        <div className="ember-bridge__telemetry" aria-label="Cockpit telemetry">
          {telemetry.map((item) => (
            <article
              className={`ember-readout ${item.className} ember-readout--${item.tone}`}
              key={item.label}
              aria-label={`${item.label} ${item.value} ${item.detail}`}
            >
              <span className="ember-readout__label">{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>

        <div className="ember-bridge__scanline" aria-hidden="true" />
        <div className="ember-bridge__caption" aria-hidden="true">
          <span>EMBER BRIDGE</span>
          <i />
          <span>PILOT VIEW / 01</span>
        </div>
      </section>
    </main>
  );
}