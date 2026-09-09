import React from "react";
import "./Prism.css";

export default function Prism() {
  return (
    <main className="prism-mockup" aria-label="Fragments Neon Prism Chassis HUD">
      <section className="prism-mockup__phone" aria-label="Mobile game screen preview">
        <header className="prism-mockup__masthead">
          <span>FRAGMENTS / NEON</span>
          <span className="prism-mockup__signal"><i /> LINK 07</span>
        </header>
        <section className="prism-chassis" aria-label="Prism chassis game statistics">
          <span className="prism-chassis__wing prism-chassis__wing--left" aria-hidden="true" />
          <span className="prism-chassis__wing prism-chassis__wing--right" aria-hidden="true" />
          <span className="prism-chassis__nose" aria-hidden="true" />
          <span className="prism-chassis__tail" aria-hidden="true" />
          <span className="prism-chassis__rivet prism-chassis__rivet--a" aria-hidden="true" />
          <span className="prism-chassis__rivet prism-chassis__rivet--b" aria-hidden="true" />
          <span className="prism-chassis__rivet prism-chassis__rivet--c" aria-hidden="true" />
          <span className="prism-chassis__rivet prism-chassis__rivet--d" aria-hidden="true" />
          <img className="prism-chassis__crystal" src="/__mockup/images/neon-diamond-fragment.png" alt="" aria-hidden="true" />
          <article className="prism-window prism-window--score" aria-label="Score 000000">
            <span className="prism-window__label">SCORE / RUN</span>
            <strong>000000</strong>
          </article>
          <article className="prism-window prism-window--sector" aria-label="Sector 01">
            <span className="prism-window__label">SECTEUR</span>
            <strong>01</strong>
          </article>
          <article className="prism-window prism-window--shield" aria-label="Three shields">
            <span className="prism-window__label">BOUCLIERS</span>
            <strong>3</strong>
            <span className="prism-window__shards" aria-hidden="true"><i /><i /><i /></span>
          </article>
          <article className="prism-window prism-window--zone" aria-label="Zone 0 percent out of 80">
            <span className="prism-window__label">ZONE CAPTUREE</span>
            <strong>0%<small>/80</small></strong>
          </article>
        </section>
        <div className="prism-mockup__playfield" aria-hidden="true">
          <span className="prism-mockup__cut" />
          <span className="prism-mockup__fragment" />
        </div>
      </section>
    </main>
  );
}