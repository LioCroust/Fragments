import React from "react";
import "./_group.css";

export default function Command() {
  return (
    <main className="fragments-hud fragments-hud--command" aria-label="Fragments Neon Enemy Command HUD">
      <section className="fragments-hud__phone" aria-label="Mobile game screen preview">
        <div className="cockpit__hud">
          <header className="cockpit__masthead">
            <span className="cockpit__title">ENEMY COMMAND</span>
            <span className="cockpit__readout">PRISM // A-01</span>
          </header>
          <section className="cockpit__silhouette" aria-label="Armored enemy cockpit statistics">
            <img className="cockpit__diamond" src="/__mockup/images/neon-diamond-fragment.png" alt="" aria-hidden="true" />
            <span className="cockpit__core-glass" aria-hidden="true" />
            <span className="cockpit__wing cockpit__wing--left" aria-hidden="true" />
            <span className="cockpit__wing cockpit__wing--right" aria-hidden="true" />
            <span className="cockpit__fin cockpit__fin--left" aria-hidden="true" />
            <span className="cockpit__fin cockpit__fin--right" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--a" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--b" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--c" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--d" aria-hidden="true" />
            <article className="cockpit__visor cockpit__visor--score" aria-label="Score 000000">
              <span className="cockpit__eyebrow">CORE LOCKED</span>
              <strong className="cockpit__value">000000</strong>
              <span className="cockpit__label">SCORE</span>
            </article>
            <article className="cockpit__visor cockpit__visor--sector" aria-label="Sector 01">
              <span className="cockpit__label">SECTEUR</span>
              <strong className="cockpit__value">01</strong>
            </article>
            <article className="cockpit__visor cockpit__visor--shields" aria-label="Three shields">
              <span className="cockpit__label">BOUCLIERS</span>
              <strong className="cockpit__value">3</strong>
              <span className="cockpit__shield-facets" aria-hidden="true"><i /><i /><i /></span>
            </article>
            <article className="cockpit__visor cockpit__visor--zone" aria-label="Zone 0 percent out of 80">
              <span className="cockpit__label">ZONE</span>
              <strong className="cockpit__value">0%<small>/80</small></strong>
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