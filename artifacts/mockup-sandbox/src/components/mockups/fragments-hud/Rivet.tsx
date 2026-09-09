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
          <img className="rivet-bay__shell" src="/__mockup/images/rivet-command-cockpit-shell_cutout.png" alt="" aria-hidden="true" />
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