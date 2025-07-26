import { useState, useEffect } from 'react';
import { login, autocomplete, getPlaceDetails, searchNearby, toggleFavorite } from '../lib/api';
import Nav from '../components/Nav';

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(3000);
  const [sort, setSort] = useState('default');
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogin = async () => {
    if (!username.trim()) return;
    const data = await login(username.trim());
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setUsername('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setFavorites(new Set());
  };

  const handleLocationInput = async (value) => {
    setLocationQuery(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const data = await autocomplete(value);
    setSuggestions(data.predictions || []);
  };

  const selectSuggestion = async (suggestion) => {
    setLocationQuery(suggestion.description);
    setSuggestions([]);
    
    const data = await getPlaceDetails(suggestion.placeId);
    if (data.place) {
      setCenter({
        lat: data.place.lat,
        lng: data.place.lng,
        name: data.place.name,
      });
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'My Location',
        });
        setLocationQuery('My Location');
      },
      () => alert('Could not get location')
    );
  };

  const handleSearch = async () => {
    if (!center) {
      alert('Please select a location first');
      return;
    }
    const data = await searchNearby(center.lat, center.lng, radius, sort);
    setPlaces(data.places || []);
  };

  const handleFavorite = async (placeId) => {
    if (!user) {
      alert('Please login to favorite places');
      return;
    }
    const data = await toggleFavorite(user.id, placeId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (data.isFavorited) {
        next.add(placeId);
      } else {
        next.delete(placeId);
      }
      return next;
    });
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="container">
      <Nav />
      <h1 className="title">🍵 Matcha Finder</h1>
      <p className="tagline">Discover local matcha cafés + drinks</p>

      {user ? (
        <div className="user-section">
          <p>Logged in as <strong>{user.username}</strong></p>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="login-section">
          <input
            type="text"
            className="input"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn btn-primary" onClick={handleLogin}>
            Login
          </button>
        </div>
      )}

      <div className="search-section">
        <h2>Find Matcha Near</h2>
        <div className="autocomplete-wrapper">
          <input
            type="text"
            className="input input-wide"
            placeholder="Search for a location..."
            value={locationQuery}
            onChange={(e) => handleLocationInput(e.target.value)}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s.placeId} onClick={() => selectSuggestion(s)}>
                  {s.description}
                </li>
              ))}
            </ul>
          )}
        </div>
        {center && (
          <p className="selected-place">
            📍 {center.name} ({center.lat.toFixed(4)}, {center.lng.toFixed(4)})
          </p>
        )}

        <div className="search-controls">
          <label>
            Radius (m):
            <input
              type="number"
              className="input input-small"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </label>
          <label>
            Sort by:
            <select
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Best Match</option>
              <option value="distance">Distance</option>
              <option value="rating">Rating</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>
        </div>

        <div className="buttons">
          <button className="btn btn-primary" onClick={useMyLocation}>
            Use My Location
          </button>
          <button className="btn btn-secondary" onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>

      {places.length > 0 && (
        <div className="results-section">
          <h2>Results ({places.length})</h2>
          <ul className="results-list">
            {places.map((place) => (
              <li key={place.placeId} className="result-item">
                <div className="result-header">
                  <strong>{place.name}</strong>
                  <div className="result-actions">
                    <span className="result-distance">{formatDistance(place.distance)}</span>
                    <button
                      className={`btn-heart ${favorites.has(place.placeId) ? 'active' : ''}`}
                      onClick={() => handleFavorite(place.placeId)}
                    >
                      {favorites.has(place.placeId) ? '❤️' : '🤍'}
                    </button>
                  </div>
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
        </div>
      )}
    </div>
  );
}
