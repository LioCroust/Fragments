import React from "react";
import "./Rivet.css";

export default function Rivet() {
  return (
    <main className="rivet-mockup" aria-label="Fragments Neon Rivet Command HUD">
      <section className="rivet-mockup__phone" aria-label="Mobile game screen preview">
        <header className="rivet-mockup__masthead">
          <span>PRISM ARROW / ARMOR BAY</span>
          <span className="rivet-mockup__status">LIVE <i /></span>
        </header>
        <section className="rivet-bay" aria-label="Mechanical cockpit statistics">
          <span className="rivet-bay__backplate" aria-hidden="true" />
          <span className="rivet-bay__rail rivet-bay__rail--top" aria-hidden="true" />
          <span className="rivet-bay__rail rivet-bay__rail--bottom" aria-hidden="true" />
          <span className="rivet-bay__bolt rivet-bay__bolt--a" aria-hidden="true" />
          <span className="rivet-bay__bolt rivet-bay__bolt--b" aria-hidden="true" />
          <span className="rivet-bay__bolt rivet-bay__bolt--c" aria-hidden="true" />
          <span className="rivet-bay__bolt rivet-bay__bolt--d" aria-hidden="true" />
          <span className="rivet-bay__claw rivet-bay__claw--left" aria-hidden="true" />
          <span className="rivet-bay__claw rivet-bay__claw--right" aria-hidden="true" />
          <img className="rivet-bay__crystal" src="/__mockup/images/neon-diamond-fragment.png" alt="" aria-hidden="true" />
          <article className="rivet-readout rivet-readout--score" aria-label="Score 000000">
            <span className="rivet-readout__label">MISSION SCORE</span>
            <strong>000000</strong>
            <i className="rivet-readout__meter" aria-hidden="true" />
          </article>
          <article className="rivet-readout rivet-readout--sector" aria-label="Sector 01">
            <span className="rivet-readout__label">SEC</span>
            <strong>01</strong>
          </article>
          <article className="rivet-readout rivet-readout--shield" aria-label="Three shields">
            <span className="rivet-readout__label">SHD</span>
            <strong>3</strong>
            <span className="rivet-readout__dots" aria-hidden="true"><i /><i /><i /></span>
          </article>
          <article className="rivet-readout rivet-readout--zone" aria-label="Zone 0 percent out of 80">
            <span className="rivet-readout__label">CAPTURE / LIMIT</span>
            <strong>0%<small> /80</small></strong>
          </article>
        </section>
        <div className="rivet-mockup__playfield" aria-hidden="true"><span /></div>
      </section>
    </main>
  );
}