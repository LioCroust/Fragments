import React from "react";
import "./_group.css";

export default function Prism() {
  return (
    <main className="fragments-hud fragments-hud--prism" aria-label="Fragments Neon Prism Crystal HUD">
      <section className="fragments-hud__phone" aria-label="Mobile game screen preview">
        <div className="prism__hud">
          <header className="prism__masthead">
            <span className="prism__title">FRAGMENTS / NEON</span>
            <span className="prism__signal">LINK 07</span>
          </header>
          <section className="prism__grid" aria-label="Crystal-cut game statistics">
            <article className="prism__module prism__module--score" aria-label="Score 000000">
              <span className="fragments-hud__eyebrow">RUN ARTIFACT</span>
              <strong className="fragments-hud__value">000000</strong>
              <span className="fragments-hud__label">SCORE</span>
            </article>
            <article className="prism__module prism__module--sector" aria-label="Sector 01">
              <span className="fragments-hud__label">SECTEUR</span>
              <strong className="fragments-hud__value">01</strong>
            </article>
            <article className="prism__module prism__module--zone" aria-label="Zone 0 percent out of 80">
              <span className="fragments-hud__label">ZONE</span>
              <strong className="fragments-hud__value">0%<small>/80</small></strong>
            </article>
            <article className="prism__module prism__module--shields" aria-label="Three shields">
              <span>
                <span className="fragments-hud__label">BOUCLIERS</span>
                <strong className="fragments-hud__value">3</strong>
              </span>
              <span className="prism__shield-rack" aria-hidden="true"><i /><i /><i /></span>
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