import { useState } from 'react';

export default function Home() {
  return (
    <div className="container">
      <h1 className="title">🍵 Matcha Finder</h1>
      <p className="tagline">Discover local matcha cafés + drinks</p>

      <div className="buttons">
        <button className="btn btn-primary">Use My Location</button>
        <button className="btn btn-secondary">Search</button>
      </div>
    </div>
  );
}
