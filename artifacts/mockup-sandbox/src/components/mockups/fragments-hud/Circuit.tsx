import React from "react";
import "./_group.css";

export default function Circuit() {
  return (
    <main className="fragments-hud fragments-hud--circuit" aria-label="Fragments Neon Neon Circuit HUD">
      <section className="fragments-hud__phone" aria-label="Mobile game screen preview">
        <div className="circuit__hud">
          <header className="circuit__masthead">
            <span className="circuit__title">PERIMETER / LIVE</span>
            <span className="circuit__read">TRACE 0007</span>
          </header>
          <section className="circuit__board" aria-label="Connected energy rail statistics">
            <span className="circuit__trace circuit__trace--top" aria-hidden="true" />
            <span className="circuit__trace circuit__trace--left" aria-hidden="true" />
            <span className="circuit__trace circuit__trace--right" aria-hidden="true" />
            <span className="circuit__trace circuit__trace--bottom" aria-hidden="true" />
            <span className="circuit__joint circuit__joint--a" aria-hidden="true" />
            <span className="circuit__joint circuit__joint--b" aria-hidden="true" />
            <span className="circuit__joint circuit__joint--c" aria-hidden="true" />
            <span className="circuit__joint circuit__joint--d" aria-hidden="true" />
            <article className="circuit__node circuit__node--score" aria-label="Score 000000">
              <span className="fragments-hud__label">SCORE</span>
              <strong className="fragments-hud__value">000000</strong>
            </article>
            <article className="circuit__node circuit__node--sector" aria-label="Sector 01">
              <span className="fragments-hud__label">SECTEUR</span>
              <strong className="fragments-hud__value">01</strong>
            </article>
            <article className="circuit__node circuit__node--shield" aria-label="Three shields">
              <span className="fragments-hud__label">BOUCLIERS</span>
              <strong className="fragments-hud__value">3</strong>
            </article>
            <article className="circuit__node circuit__node--zone" aria-label="Zone 0 percent out of 80">
              <span className="fragments-hud__label">ZONE</span>
              <strong className="fragments-hud__value">0%<small>/80</small></strong>
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