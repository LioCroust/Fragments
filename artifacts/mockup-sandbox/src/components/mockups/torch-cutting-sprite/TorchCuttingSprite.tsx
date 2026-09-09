import { useEffect, useState } from "react";

const phases = [
  { name: "Amorçage", detail: "Le chalumeau accroche le trait rouge", heat: 0.72 },
  { name: "Percée", detail: "Arc blanc et gerbe d'étincelles", heat: 1 },
  { name: "Fusion", detail: "Le point de coupe reste incandescent", heat: 0.92 },
  { name: "Traînée", detail: "Les braises refroidissent derrière", heat: 0.62 },
  { name: "Refroidissement", detail: "Les dernières particules s'éteignent", heat: 0.3 },
  { name: "Boucle", detail: "Retour fluide vers l'amorçage", heat: 0.58 },
];

function Spark({
  x,
  y,
  length,
  angle,
  delay,
  color = "#ff9d38",
  opacity = 1,
}: {
  x: number;
  y: number;
  length: number;
  angle: number;
  delay: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <span
      className="spark"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${length}px`,
        background: color,
        opacity,
        transform: `rotate(${angle}deg)`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function TorchHead({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`torch-head ${compact ? "torch-head--compact" : ""}`}>
      <div className="torch-nozzle" />
      <div className="torch-core" />
      <div className="torch-ring" />
      <div className="torch-glow" />
      <div className="torch-haze haze-one" />
      <div className="torch-haze haze-two" />
      <Spark x={22} y={10} length={20} angle={-38} delay={0.1} color="#fff5c7" />
      <Spark x={35} y={78} length={15} angle={28} delay={0.4} />
      <Spark x={50} y={6} length={11} angle={-64} delay={0.65} color="#ffe19b" />
      <Spark x={56} y={80} length={23} angle={18} delay={0.85} color="#ff6b22" />
      <Spark x={12} y={62} length={12} angle={160} delay={0.95} color="#ffd36e" />
    </div>
  );
}

function Scene({ small = false }: { small?: boolean }) {
  return (
    <div className={`scene ${small ? "scene--small" : ""}`}>
      <div className="scanlines" />
      <div className="grid-glow" />
      <div className="red-trail">
        <span className="trail-hotspot" />
      </div>
      <div className="cooling-trail cooling-one" />
      <div className="cooling-trail cooling-two" />
      <div className="torch-anchor">
        <TorchHead compact={small} />
      </div>
      <img
        className="drone"
        src="/__mockup/images/player-drone-prism-arrow.png"
        alt="Prism Arrow drone"
      />
      <div className="drone-aura" />
      {!small && (
        <div className="scene-caption">
          <span className="caption-dot" />
          <span>COUPE ACTIVE · REFROIDISSEMENT DES ÉTINCELLES</span>
        </div>
      )}
    </div>
  );
}

export function TorchCuttingSprite() {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % phases.length);
    }, 950);
    return () => window.clearInterval(timer);
  }, []);

  const phase = phases[frame];

  return (
    <main className="torch-preview">
      <style>{`
        :root {
          color-scheme: dark;
          font-family: "Rajdhani", "Arial Narrow", sans-serif;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          min-width: 980px;
          background: #020407;
          color: #f6e8c4;
        }

        .torch-preview {
          min-height: 820px;
          padding: 34px 44px 38px;
          background:
            radial-gradient(circle at 70% 12%, rgba(184, 76, 17, .12), transparent 28%),
            linear-gradient(135deg, #020407 0%, #080b10 48%, #030405 100%);
          overflow: hidden;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9fabb0;
          font-size: 12px;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .eyebrow i {
          display: block;
          width: 7px;
          height: 7px;
          background: #ff772e;
          box-shadow: 0 0 12px #ff772e;
        }

        h1 {
          margin: 17px 0 7px;
          color: #fff2cf;
          font-size: 35px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .intro {
          margin: 0;
          max-width: 780px;
          color: #8b979a;
          font-size: 15px;
          letter-spacing: .04em;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 255px;
          gap: 20px;
          margin-top: 26px;
        }

        .scene {
          position: relative;
          height: 395px;
          overflow: hidden;
          border: 1px solid rgba(255, 154, 55, .56);
          background: #071014;
          box-shadow:
            inset 0 0 50px rgba(0, 0, 0, .72),
            0 0 25px rgba(255, 93, 25, .08);
          isolation: isolate;
        }

        .scene--small {
          height: 135px;
          border-color: rgba(255, 143, 46, .34);
          background: #080d10;
        }

        .grid-glow {
          position: absolute;
          inset: 0;
          opacity: .5;
          background-image:
            linear-gradient(rgba(75, 132, 132, .14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(75, 132, 132, .14) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent);
        }

        .scanlines {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: .22;
          background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.025) 4px);
        }

        .red-trail {
          position: absolute;
          left: 9%;
          right: 8%;
          top: 58%;
          height: 5px;
          z-index: 2;
          border-radius: 99px;
          background: #e8472a;
          box-shadow:
            0 0 6px #ff4323,
            0 0 17px rgba(255, 53, 22, .74),
            0 0 32px rgba(255, 60, 20, .18);
        }

        .trail-hotspot {
          position: absolute;
          left: 54%;
          top: 50%;
          width: 86px;
          height: 16px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(255, 104, 34, .72);
          filter: blur(8px);
          animation: hotspot 1.9s ease-in-out infinite;
        }

        .cooling-trail {
          position: absolute;
          z-index: 3;
          height: 2px;
          border-radius: 999px;
          transform-origin: left center;
          filter: blur(.2px);
          animation: cooling 1.9s ease-out infinite;
        }

        .cooling-one {
          left: 39%;
          top: calc(58% - 8px);
          width: 48px;
          background: linear-gradient(90deg, #ffe8a0, #ff8f31, transparent);
        }

        .cooling-two {
          left: 42%;
          top: calc(58% + 10px);
          width: 29px;
          opacity: .65;
          background: linear-gradient(90deg, #ffb347, transparent);
          animation-delay: .22s;
        }

        .torch-anchor {
          position: absolute;
          left: 51%;
          top: calc(58% - 30px);
          z-index: 9;
          width: 110px;
          height: 70px;
          transform: translateX(-50%);
        }

        .torch-head {
          position: relative;
          width: 110px;
          height: 70px;
          filter: drop-shadow(0 0 5px rgba(255, 119, 41, .9));
          animation: torchJitter .12s steps(2) infinite;
        }

        .torch-head--compact {
          transform: scale(.72);
          transform-origin: center;
        }

        .torch-nozzle {
          position: absolute;
          left: 7px;
          top: 29px;
          width: 52px;
          height: 13px;
          border: 2px solid #d28c52;
          border-right: 0;
          border-radius: 8px 0 0 8px;
          transform: skewX(-19deg);
          background: linear-gradient(#554034, #1b1919);
          box-shadow: inset 0 2px #f0bd75, 0 0 10px rgba(255, 120, 37, .34);
        }

        .torch-nozzle::after {
          content: "";
          position: absolute;
          right: -10px;
          top: 2px;
          width: 12px;
          height: 6px;
          border-radius: 50%;
          background: #fff2c2;
          box-shadow: 0 0 8px #fff, 0 0 21px #ff8c2d;
        }

        .torch-core {
          position: absolute;
          left: 47px;
          top: 30px;
          width: 35px;
          height: 9px;
          border-radius: 50%;
          background: linear-gradient(90deg, #fff9d1 0%, #fff 30%, #ffbd51 70%, transparent);
          filter: blur(1px);
          animation: arcPulse .38s ease-in-out infinite alternate;
        }

        .torch-ring {
          position: absolute;
          left: 42px;
          top: 19px;
          width: 34px;
          height: 32px;
          border: 2px solid rgba(255, 148, 44, .82);
          border-left-color: rgba(255, 236, 147, .92);
          border-radius: 50%;
          transform: rotate(-22deg);
          box-shadow: 0 0 9px rgba(255, 122, 27, .9), inset 0 0 9px rgba(255, 92, 18, .48);
          animation: ringSpin .72s linear infinite;
        }

        .torch-glow {
          position: absolute;
          left: 40px;
          top: 14px;
          width: 54px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255, 228, 140, .48), rgba(255, 82, 16, .22) 44%, transparent 72%);
          filter: blur(6px);
          animation: glowPulse .45s ease-in-out infinite alternate;
        }

        .torch-haze {
          position: absolute;
          left: 8px;
          width: 70px;
          height: 28px;
          border-radius: 50%;
          border-top: 2px solid rgba(255, 148, 71, .38);
          filter: blur(2px);
          opacity: .5;
        }

        .haze-one { top: 10px; transform: rotate(-14deg); animation: hazeFloat 1.5s ease-in-out infinite; }
        .haze-two { top: 41px; transform: rotate(13deg); animation: hazeFloat 1.9s ease-in-out infinite reverse; }

        .spark {
          position: absolute;
          z-index: 4;
          height: 2px;
          transform-origin: left center;
          border-radius: 100%;
          box-shadow: 0 0 5px currentColor, 0 0 11px currentColor;
          animation: sparkFly 1.05s cubic-bezier(.2,.8,.28,1) infinite;
        }

        .drone {
          position: absolute;
          left: 67%;
          top: calc(58% - 56px);
          z-index: 8;
          width: 118px;
          height: 118px;
          object-fit: contain;
          transform: rotate(90deg);
          filter: drop-shadow(0 0 8px rgba(39, 239, 255, .5));
          animation: droneHover 1.7s ease-in-out infinite;
        }

        .drone-aura {
          position: absolute;
          left: 67%;
          top: calc(58% - 1px);
          z-index: 1;
          width: 110px;
          height: 20px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(255, 87, 28, .42);
          filter: blur(13px);
          animation: auraPulse 1.1s ease-in-out infinite;
        }

        .scene-caption {
          position: absolute;
          left: 22px;
          bottom: 18px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #bdc3bb;
          font-size: 10px;
          letter-spacing: .18em;
        }

        .caption-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff7f2c;
          box-shadow: 0 0 10px #ff7f2c;
        }

        .spec-panel {
          padding: 21px 18px;
          border: 1px solid rgba(116, 139, 137, .27);
          background: linear-gradient(160deg, rgba(26, 34, 37, .84), rgba(5, 9, 11, .86));
        }

        .spec-label {
          color: #ff9a43;
          font-size: 11px;
          letter-spacing: .19em;
          text-transform: uppercase;
        }

        .spec-panel h2 {
          margin: 10px 0 18px;
          color: #f8e5b4;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 0;
          border-top: 1px solid rgba(150, 157, 143, .16);
          color: #899697;
          font-size: 12px;
          letter-spacing: .06em;
        }

        .spec-row strong {
          color: #f5edce;
          font-weight: 500;
          text-align: right;
        }

        .active-phase {
          margin-top: 21px;
          padding: 14px 13px;
          border-left: 2px solid #ff7a2d;
          background: rgba(255, 95, 27, .09);
        }

        .active-phase small {
          display: block;
          margin-bottom: 5px;
          color: #9aa7a4;
          font-size: 10px;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .active-phase b {
          color: #fff1c5;
          font-size: 20px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .active-phase p {
          margin: 6px 0 0;
          color: #d17943;
          font-size: 11px;
          line-height: 1.45;
        }

        .strip-title {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin: 24px 0 10px;
        }

        .strip-title h3 {
          margin: 0;
          color: #e7d7af;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .strip-title span {
          color: #687779;
          font-size: 10px;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .frame-strip {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 9px;
        }

        .frame-card {
          min-width: 0;
          border: 1px solid rgba(131, 147, 141, .2);
          background: rgba(4, 8, 10, .76);
          transition: border-color .25s, transform .25s, box-shadow .25s;
        }

        .frame-card.is-active {
          border-color: rgba(255, 143, 45, .75);
          box-shadow: 0 0 15px rgba(255, 87, 22, .16);
          transform: translateY(-3px);
        }

        .frame-name {
          padding: 8px 9px 3px;
          color: #ebdfbe;
          font-size: 11px;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .frame-detail {
          min-height: 29px;
          padding: 0 9px 8px;
          color: #738181;
          font-size: 10px;
          line-height: 1.25;
        }

        @keyframes torchJitter {
          0%, 100% { transform: translate(0, 0) rotate(-1deg); }
          50% { transform: translate(1px, -1px) rotate(1deg); }
        }
        @keyframes arcPulse { from { opacity: .72; transform: scaleX(.8); } to { opacity: 1; transform: scaleX(1.14); } }
        @keyframes ringSpin { to { transform: rotate(338deg); } }
        @keyframes glowPulse { from { opacity: .66; transform: scale(.84); } to { opacity: 1; transform: scale(1.14); } }
        @keyframes hazeFloat { 0%, 100% { transform: translate(0, 0) rotate(-14deg); opacity: .28; } 50% { transform: translate(8px, -8px) rotate(4deg); opacity: .68; } }
        @keyframes sparkFly {
          0% { opacity: 0; transform: translate(0, 0) scaleX(.45) rotate(var(--spark-angle)); }
          18% { opacity: 1; }
          100% { opacity: 0; transform: translate(26px, -25px) scaleX(1) rotate(var(--spark-angle)); }
        }
        @keyframes hotspot { 0%, 100% { opacity: .6; transform: translate(-50%, -50%) scaleX(.8); } 50% { opacity: 1; transform: translate(-50%, -50%) scaleX(1.2); } }
        @keyframes cooling { 0% { opacity: .8; transform: scaleX(1); } 100% { opacity: 0; transform: scaleX(.45); } }
        @keyframes droneHover { 0%, 100% { margin-top: 0; } 50% { margin-top: -4px; } }
        @keyframes auraPulse { 0%, 100% { opacity: .4; transform: translate(-50%, -50%) scale(.8); } 50% { opacity: .75; transform: translate(-50%, -50%) scale(1.1); } }
      `}</style>

      <div className="eyebrow"><i /> Fragments Neon / FX Lab / Trait rouge</div>
      <h1>Prism Torch — sprite de découpe</h1>
      <p className="intro">
        Le chalumeau reste collé au trait rouge derrière le drone : l&apos;arc découpe,
        les étincelles partent vers l&apos;arrière, puis refroidissent sans laisser de fumée persistante.
      </p>

      <section className="hero">
        <Scene />
        <aside className="spec-panel">
          <div className="spec-label">Prévisualisation animée</div>
          <h2>{phase.name}</h2>
          <div className="spec-row"><span>Position</span><strong>Derrière le drone</strong></div>
          <div className="spec-row"><span>Support</span><strong>Trait rouge actif</strong></div>
          <div className="spec-row"><span>Sortie</span><strong>PNG transparent</strong></div>
          <div className="spec-row"><span>Lecture</span><strong>Loop 6 frames</strong></div>
          <div className="active-phase">
            <small>Phase en cours</small>
            <b>{phase.name}</b>
            <p>{phase.detail}</p>
          </div>
        </aside>
      </section>

      <div className="strip-title">
        <h3>Découpage de l&apos;animation</h3>
        <span>Le point chaud reste au contact du trait</span>
      </div>
      <section className="frame-strip">
        {phases.map((item, index) => (
          <article className={`frame-card ${index === frame ? "is-active" : ""}`} key={item.name}>
            <div className="frame-name">{String(index + 1).padStart(2, "0")} · {item.name}</div>
            <Scene small />
            <div className="frame-detail">{item.detail}</div>
          </article>
        ))}
      </section>
    </main>
  );
}