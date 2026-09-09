import React from "react";
import "./FurnaceManta.css";

export default function FurnaceManta() {
  return (
    <main className="furnace-manta-preview" aria-label="Fragments Neon Furnace Manta enemy sprite">
      <div className="furnace-manta-preview__frame">
        <img
          className="furnace-manta-preview__art"
          src="/__mockup/images/furnace-manta-enemy.png"
          alt="A broad furnace-red manta-shaped mechanical enemy with a hanging orange crystal reactor"
        />
      </div>
    </main>
  );
}