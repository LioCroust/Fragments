import React from "react";
import "./RubyInterceptor.css";

function Telemetry({
  className,
  label,
  value,
  suffix,
  detail,
  tone = "ember",
  ariaLabel,
}: {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  detail?: string;
  tone?: "ember" | "ruby" | "gold";
  ariaLabel: string;
}) {
  return (
    <article className={`ruby-telemetry ruby-telemetry--${tone} ${className}`} aria-label={ariaLabel}>
      <span className="ruby-telemetry__bolt" aria-hidden="true" />
      <span className="ruby-telemetry__label">{label}</span>
      <strong className="ruby-telemetry__value">
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </strong>
      {detail ? <span className="ruby-telemetry__detail">{detail}</span> : null}
    </article>
  );
}

export default function RubyInterceptor() {
  return (
    <main className="ruby-interceptor" aria-label="Fragments Neon Ruby Interceptor cockpit HUD">
      <div className="ruby-interceptor__caption">
        <span>FRAGMENTS NEON / INTERCEPTOR-02</span>
        <span className="ruby-interceptor__live"><i aria-hidden="true" /> TARGETING LINK</span>
      </div>

      <section className="ruby-interceptor__stage" aria-label="Ruby interceptor vessel instrument panel">
        <img
          className="ruby-interceptor__shell"
          src="/__mockup/images/ruby-interceptor-cockpit.png"
          alt="Ruby interceptor spacecraft cockpit with swept armor, split canopy and central crystal"
        />

        <Telemetry
          className="ruby-telemetry--score"
          label="SCORE"
          value="047280"
          detail="PURSUIT RUN"
          tone="gold"
          ariaLabel="Score 047280"
        />
        <Telemetry
          className="ruby-telemetry--sector"
          label="SECTEUR"
          value="07"
          detail="RUBY VEIL"
          tone="ruby"
          ariaLabel="Secteur 07"
        />
        <Telemetry
          className="ruby-telemetry--shields"
          label="BOUCLIERS"
          value="3"
          detail="ARMOR LOCK"
          tone="ember"
          ariaLabel="Boucliers 3"
        />
        <Telemetry
          className="ruby-telemetry--zone"
          label="ZONE"
          value="62"
          suffix=" / 80"
          detail="CUT DEPTH"
          tone="gold"
          ariaLabel="Zone 62 out of 80"
        />

        <div className="ruby-interceptor__spine-readout" aria-hidden="true">
          <span>R-02</span>
          <i />
          <span>LOCK</span>
        </div>
      </section>

      <footer className="ruby-interceptor__footer" aria-hidden="true">
        <span>NOCTURNE ARMOR / PILOTED HOSTILE VESSEL</span>
        <span>CRYSTAL CORE: STABLE</span>
      </footer>
    </main>
  );
}