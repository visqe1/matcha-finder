import { useState, useEffect } from 'react';
import { login, autocomplete } from '../lib/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

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

  const selectSuggestion = (suggestion) => {
    setSelectedPlace(suggestion);
    setLocationQuery(suggestion.description);
    setSuggestions([]);
  };

  return (
    <div className="container">
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
        {selectedPlace && (
          <p className="selected-place">Selected: {selectedPlace.description}</p>
        )}
      </div>

      <div className="buttons">
        <button className="btn btn-primary">Use My Location</button>
        <button className="btn btn-secondary">Search</button>
      </div>
    </div>
  );
}
