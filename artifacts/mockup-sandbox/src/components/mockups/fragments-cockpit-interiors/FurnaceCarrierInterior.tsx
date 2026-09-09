import "./FurnaceCarrierInterior.css";

type ReadoutProps = {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  detail?: string;
  accent?: "ember" | "ruby" | "gold" | "cyan";
};

function Readout({ className, label, value, suffix, detail, accent = "ember" }: ReadoutProps) {
  return (
    <article className={`furnace-readout furnace-readout--${accent} ${className}`} aria-label={`${label} ${value}${suffix ?? ""}`}>
      <span className="furnace-readout__label">{label}</span>
      <strong className="furnace-readout__value">
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
      {detail && <span className="furnace-readout__detail">{detail}</span>}
    </article>
  );
}

export default function FurnaceCarrierInterior() {
  return (
    <main className="furnace-cockpit" aria-label="Fragments Neon Furnace Carrier cockpit interior">
      <section className="furnace-cockpit__stage" aria-label="Pilot view of the Furnace Carrier bridge">
        <div
          className="furnace-cockpit__shell"
          role="img"
          aria-label="Industrial spacecraft cockpit interior with hangar windshield, riveted bulkheads, analog gauges, side consoles and a glowing diamond console crystal"
        />

        <div className="furnace-readouts" aria-label="Cockpit telemetry">
          <Readout
            className="furnace-readout--score"
            label="SCORE"
            value="047280"
            detail="BRIDGE RUN"
            accent="gold"
          />
          <Readout
            className="furnace-readout--sector"
            label="SECTEUR"
            value="07"
            detail="HANGAR RING"
            accent="ruby"
          />
          <Readout
            className="furnace-readout--shields"
            label="BOUCLIERS"
            value="3"
            detail="PLATES NOMINAL"
            accent="cyan"
          />
          <Readout
            className="furnace-readout--zone"
            label="ZONE"
            value="42"
            suffix=" / 80"
            detail="DECK HEAT"
            accent="ember"
          />
        </div>
      </section>
      <p className="furnace-cockpit__caption">FURNACE CARRIER // BRIDGE 07 // PILOT VIEW</p>
    </main>
  );
}