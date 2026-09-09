import React from "react";

const spriteUrl = "/__mockup/images/ember-fang-enemy.png";

export default function EmberFang() {
  return (
    <main className="ember-fang-preview" aria-label="Fragments Neon Enemy Sprite 01 Ember Fang">
      <style>{`
        .ember-fang-preview {
          width: 100%;
          min-height: 100dvh;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #0d090b;
        }

        .ember-fang-preview__frame {
          width: 100%;
          aspect-ratio: 4 / 1;
          display: grid;
          place-items: center;
          overflow: visible;
        }

        .ember-fang-preview__sprite {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }
      `}</style>
      <div className="ember-fang-preview__frame">
        <img
          className="ember-fang-preview__sprite"
          src={spriteUrl}
          alt="Ember Fang, a horizontal predatory armored interceptor with a recessed ruby-orange diamond core"
        />
      </div>
    </main>
  );
}