import React from "react";

const spriteUrl = "/__mockup/images/ruby-bastion-enemy.png";

export default function RubyBastion() {
  return (
    <main className="ruby-bastion-preview" aria-label="Fragments Neon Enemy Sprite 04 — Ruby Bastion">
      <img
        className="ruby-bastion-preview__sprite"
        src={spriteUrl}
        alt="Ruby Bastion, a wide armored fortress enemy with a shielded ruby crystal core"
      />
      <style>{`
        :root,
        body {
          margin: 0;
          min-width: 100%;
          min-height: 100%;
          background: #08070a;
        }

        .ruby-bastion-preview {
          box-sizing: border-box;
          width: 100%;
          min-height: 100dvh;
          aspect-ratio: 4 / 1;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #08070a;
        }

        .ruby-bastion-preview__sprite {
          display: block;
          width: 100%;
          height: auto;
          max-height: 100dvh;
          object-fit: contain;
          object-position: center;
        }
      `}</style>
    </main>
  );
}