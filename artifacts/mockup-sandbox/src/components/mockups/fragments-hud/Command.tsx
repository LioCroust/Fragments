import React from "react";
import "./_group.css";

export default function Command() {
  return (
    <main className="fragments-hud fragments-hud--command" aria-label="Fragments Neon Enemy Command HUD">
      <section className="fragments-hud__phone" aria-label="Mobile game screen preview">
        <div className="command__hud">
          <header className="command__header">
            <span className="command__title">ENEMY COMMAND</span>
            <span className="command__designation">PRISM // A-01</span>
          </header>
          <section className="command__frame" aria-label="Armored tactical readout">
            <article className="command__side" aria-label="Three shields">
              <span className="fragments-hud__label">BOUCLIERS</span>
              <strong className="fragments-hud__value">3</strong>
              <span className="command__ticks" aria-hidden="true"><i /><i /><i /><i /></span>
            </article>
            <article className="command__core" aria-label="Score 000000">
              <span className="fragments-hud__label">SCORE</span>
              <strong className="command__score">000000</strong>
              <span className="command__lock">CORE LOCKED</span>
            </article>
            <article className="command__side command__side--right" aria-label="Sector 01">
              <span className="fragments-hud__label">SECTEUR</span>
              <strong className="fragments-hud__value">01</strong>
              <span className="fragments-hud__label">ACTIVE</span>
            </article>
          </section>
          <section className="command__lower" aria-label="Zone progress">
            <article className="command__lower-module">
              <span className="fragments-hud__label">ZONE</span>
              <strong className="fragments-hud__value">0%</strong>
            </article>
            <article className="command__lower-module">
              <span className="fragments-hud__label">CAPTURE LIMIT</span>
              <strong className="fragments-hud__value">/80</strong>
            </article>
          </section>
        </div>
        <div className="fragments-hud__continuation" aria-hidden="true">
          <span className="fragments-hud__fragment fragments-hud__fragment--one" />
          <span className="fragments-hud__fragment fragments-hud__fragment--two" />
          <span className="fragments-hud__drone" />
        </div>
      </section>
    </main>
  );
}