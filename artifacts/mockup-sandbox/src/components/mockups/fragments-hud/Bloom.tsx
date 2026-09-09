import React from "react";
import "./Bloom.css";

export default function Bloom() {
  return (
    <main className="bloom-mockup" aria-label="Fragments Neon Crystal Bloom HUD">
      <section className="bloom-mockup__phone" aria-label="Mobile game screen preview">
        <header className="bloom-mockup__masthead">
          <span>SECTEUR 01 / CRYSTAL LINK</span>
          <span className="bloom-mockup__signal"><i /> 04.7</span>
        </header>
        <section className="bloom-core" aria-label="Radial crystal cockpit statistics">
          <span className="bloom-core__halo" aria-hidden="true" />
          <span className="bloom-core__petal bloom-core__petal--a" aria-hidden="true" />
          <span className="bloom-core__petal bloom-core__petal--b" aria-hidden="true" />
          <span className="bloom-core__petal bloom-core__petal--c" aria-hidden="true" />
          <span className="bloom-core__petal bloom-core__petal--d" aria-hidden="true" />
          <span className="bloom-core__rivets" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          <img className="bloom-core__crystal" src="/__mockup/images/neon-diamond-fragment.png" alt="" aria-hidden="true" />
          <article className="bloom-window bloom-window--score" aria-label="Score 000000">
            <span>SCORE</span><strong>000000</strong>
          </article>
          <article className="bloom-window bloom-window--sector" aria-label="Sector 01">
            <span>SECTEUR</span><strong>01</strong>
          </article>
          <article className="bloom-window bloom-window--shield" aria-label="Three shields">
            <span>BOUCLIERS</span><strong>3</strong>
          </article>
          <article className="bloom-window bloom-window--zone" aria-label="Zone 0 percent out of 80">
            <span>ZONE</span><strong>0%<small>/80</small></strong>
          </article>
        </section>
        <div className="bloom-mockup__playfield" aria-hidden="true"><span className="bloom-mockup__cut" /></div>
      </section>
    </main>
  );
}