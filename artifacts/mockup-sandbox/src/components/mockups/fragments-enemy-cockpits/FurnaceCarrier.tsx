import React from "react";
import "./FurnaceCarrier.css";

function Readout({
  className,
  label,
  value,
  suffix,
  detail,
  ariaLabel,
}: {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  detail?: string;
  ariaLabel: string;
}) {
  return (
    <article className={`furnace-readout ${className}`} aria-label={ariaLabel}>
      <span className="furnace-readout__label">{label}</span>
      <strong>{value}{suffix && <small>{suffix}</small>}</strong>
      {detail && <span className="furnace-readout__detail">{detail}</span>}
    </article>
  );
}

export default function FurnaceCarrier() {
  return (
    <main className="furnace-carrier" aria-label="Fragments Neon Furnace Carrier cockpit HUD">
      <div className="furnace-carrier__frame">
        <header className="furnace-carrier__masthead">
          <span>FC-03 / INDUSTRIAL PURSUIT CARRIER</span>
          <span className="furnace-carrier__live"><i /> FURNACE LINK // LIVE</span>
        </header>

        <section className="furnace-carrier__cockpit" aria-label="Carrier instrument panel">
          <div
            className="furnace-carrier__shell"
            role="img"
            aria-label="Wide armored furnace carrier spacecraft cockpit with copper plating, vents, gantries, and an integrated diamond reactor"
          />
          <Readout
            className="furnace-readout--score"
            label="SCORE"
            value="047 280"
            detail="RUN TOTAL"
            ariaLabel="Score 047280"
          />
          <Readout
            className="furnace-readout--sector"
            label="SECTEUR"
            value="07"
            detail="DOCK RING"
            ariaLabel="Secteur 07"
          />
          <Readout
            className="furnace-readout--shields"
            label="BOUCLIERS"
            value="03"
            detail="ARMOR LAYERS"
            ariaLabel="Boucliers 03"
          />
          <Readout
            className="furnace-readout--zone"
            label="ZONE"
            value="62"
            suffix=" / 80"
            detail="CUTTING DEPTH"
            ariaLabel="Zone 62 out of 80"
          />
        </section>

        <footer className="furnace-carrier__footer" aria-hidden="true">
          <span>REACTOR TEMP 088°C</span>
          <span>CRYSTAL LOAD <b>STABLE</b></span>
          <span>VENTS 06 / 06</span>
        </footer>
      </div>
    </main>
  );
}