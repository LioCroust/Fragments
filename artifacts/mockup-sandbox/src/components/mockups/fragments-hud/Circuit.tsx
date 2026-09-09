import React from "react";
import "./_group.css";

export default function Circuit() {
  return (
    <main className="fragments-hud fragments-hud--circuit" aria-label="Fragments Neon Neon Circuit HUD">
      <section className="fragments-hud__phone" aria-label="Mobile game screen preview">
        <div className="cockpit__hud">
          <header className="cockpit__masthead">
            <span className="cockpit__title">PERIMETER / LIVE</span>
            <span className="cockpit__readout">TRACE 0007</span>
          </header>
          <section className="cockpit__silhouette" aria-label="Connected reactor cockpit statistics">
            <img className="cockpit__diamond" src="/__mockup/images/neon-diamond-fragment.png" alt="" aria-hidden="true" />
            <span className="cockpit__core-glass" aria-hidden="true" />
            <span className="cockpit__wing cockpit__wing--left" aria-hidden="true" />
            <span className="cockpit__wing cockpit__wing--right" aria-hidden="true" />
            <span className="cockpit__fin cockpit__fin--left" aria-hidden="true" />
            <span className="cockpit__fin cockpit__fin--right" aria-hidden="true" />
            <span className="cockpit__trace circuit__trace--one" aria-hidden="true" />
            <span className="cockpit__trace circuit__trace--two" aria-hidden="true" />
            <span className="cockpit__trace circuit__trace--three" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--a" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--b" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--c" aria-hidden="true" />
            <span className="cockpit__shard cockpit__shard--d" aria-hidden="true" />
            <article className="cockpit__visor cockpit__visor--score" aria-label="Score 000000">
              <span className="cockpit__eyebrow">REACTOR CHARGE</span>
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