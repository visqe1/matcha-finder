import { useState, useEffect } from 'react';
import { getFavorites, toggleFavorite } from '../lib/api';
import Nav from '../components/Nav';

export default function Favorites() {
  const [user, setUser] = useState(null);
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      loadFavorites(u.id);
    }
  }, []);

  const loadFavorites = async (userId) => {
    const data = await getFavorites(userId);
    setPlaces(data.places || []);
  };

  const handleUnfavorite = async (placeId) => {
    await toggleFavorite(user.id, placeId);
    setPlaces((prev) => prev.filter((p) => p.placeId !== placeId));
  };

  if (!user) {
    return (
      <div className="container">
        <Nav />
        <h1 className="title">Favorites</h1>
        <p>Please login to see your favorites.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Nav />
      <h1 className="title">❤️ My Favorites</h1>

      {places.length === 0 ? (
        <p>No favorites yet. Search for places and add some!</p>
      ) : (
        <ul className="results-list">
          {places.map((place) => (
            <li key={place.placeId} className="result-item">
              <div className="result-header">
                <strong>{place.name}</strong>
                <button
                  className="btn-heart active"
                  onClick={() => handleUnfavorite(place.placeId)}
                >
                  ❤️
                </button>
              </div>
              <span className="result-address">{place.address}</span>
              <div className="result-meta">
                {place.rating && (
                  <span className="result-rating">⭐ {place.rating.toFixed(1)}</span>
                )}
                {place.userRatingsTotal && (
                  <span className="result-reviews">({place.userRatingsTotal} reviews)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

