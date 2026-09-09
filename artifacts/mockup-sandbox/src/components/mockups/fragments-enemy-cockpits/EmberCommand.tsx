import "./EmberCommand.css";

function Counter({
  className,
  label,
  value,
  suffix,
  detail,
}: {
  className: string;
  label: string;
  value: string;
  suffix?: string;
  detail?: string;
}) {
  return (
    <article className={`ember-command__counter ${className}`} aria-label={`${label} ${value}${suffix ?? ""}`}>
      <span className="ember-command__counter-label">{label}</span>
      <strong className="ember-command__counter-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
      {detail && <span className="ember-command__counter-detail">{detail}</span>}
    </article>
  );
}

export default function EmberCommand() {
  return (
    <main className="ember-command" aria-label="Fragments Neon Ember Command enemy spacecraft cockpit HUD">
      <header className="ember-command__masthead">
        <span>EMBER COMMAND / BRIDGE 07</span>
        <span className="ember-command__live">LIVE <i aria-hidden="true" /></span>
      </header>

      <section className="ember-command__stage" aria-label="Front-facing enemy flagship command bridge">
        <img
          className="ember-command__shell"
          src="/__mockup/images/ember-command-cockpit.png"
          alt="Scorched iron enemy spacecraft cockpit with copper armor and an integrated pink diamond core"
        />

        <Counter
          className="ember-command__score"
          label="SCORE"
          value="084720"
          detail="BRIDGE AUTHORITY"
        />
        <Counter
          className="ember-command__sector"
          label="SECTEUR"
          value="07"
          detail="HOSTILE"
        />
        <Counter
          className="ember-command__shields"
          label="BOUCLIERS"
          value="03"
          detail="ARMOR LOCK"
        />
        <Counter
          className="ember-command__zone"
          label="ZONE"
          value="42"
          suffix=" / 80"
          detail="CAPTURE"
        />

        <div className="ember-command__status" aria-hidden="true">
          <span>CRYSTAL SOCKET</span>
          <i />
          <span>THERMAL 68</span>
        </div>
      </section>

      <footer className="ember-command__caption">
        <span>SCORCHED IRON // COMMAND BRIDGE</span>
        <span>CORE LINK STABLE</span>
      </footer>
    </main>
  );
}