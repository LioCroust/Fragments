import React from "react";
import "./CinderReactorInterior.css";

const suggestions = [
  { label: "Cycle reactor heat", action: "cycle reactor heat" },
  { label: "Open the lever banks", action: "open the lever banks" },
  { label: "Push the viewport closer", action: "push the reactor viewport closer" },
];

function Counter({
  className,
  label,
  value,
  detail,
  ariaLabel,
}: {
  className: string;
  label: string;
  value: string;
  detail?: string;
  ariaLabel: string;
}) {
  return (
    <div className={`cinder-counter ${className}`} role="status" aria-label={ariaLabel}>
      <span className="cinder-counter__label">{label}</span>
      <strong className="cinder-counter__value">
        {value}
        {detail && <small>{detail}</small>}
      </strong>
      <span className="cinder-counter__tick" aria-hidden="true" />
    </div>
  );
}

export default function CinderReactorInterior() {
  return (
    <main className="cinder-mockup" aria-label="Fragments Neon Cinder Reactor cockpit interior">
      <section className="cinder-stage">
        <div className="cinder-stage__ambient" aria-hidden="true" />
        <div className="cinder-shell">
          <img
            className="cinder-shell__art"
            src="/__mockup/images/cinder-reactor-interior-v2.png"
            alt="Pilot-view cockpit with a circular reactor viewport, radial dashboard, gauges, and lever banks"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/__mockup/images/cinder-reactor-interior.png";
            }}
          />

          <section className="cinder-instrument-bays" aria-label="Pilot telemetry">
            <Counter
              className="cinder-counter--score"
              label="SCORE"
              value="084 260"
              ariaLabel="Score 084260"
            />
            <Counter
              className="cinder-counter--sector"
              label="SECTEUR"
              value="05"
              ariaLabel="Secteur 05"
            />
            <Counter
              className="cinder-counter--shields"
              label="BOUCLIERS"
              value="03"
              ariaLabel="Boucliers 03"
            />
            <Counter
              className="cinder-counter--zone"
              label="ZONE"
              value="47"
              detail=" / 80"
              ariaLabel="Zone 47 sur 80"
            />
          </section>
        </div>

        <div className="cinder-stage__caption" aria-hidden="true">
          <span>REACTOR CATHODE / PILOT BAY</span>
          <i />
          <span>HEAT 72°</span>
        </div>

        <nav className="cinder-actions" aria-label="Cockpit options">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.action}
              type="button"
              className="cinder-actions__button"
              onClick={() => {
                document.querySelector(".cinder-stage")?.setAttribute("data-action", suggestion.action);
              }}
            >
              <span aria-hidden="true">+</span>
              {suggestion.label}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}