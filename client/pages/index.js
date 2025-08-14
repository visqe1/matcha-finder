import { useState, useEffect } from 'react';
import { searchNearby, toggleFavorite, getTags } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import LoginForm from '../components/LoginForm';
import LocationSearch from '../components/LocationSearch';
import PlaceCard from '../components/PlaceCard';

export default function Home() {
  const { user, saveUser, clearUser } = useAuth();
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(3000);
  const [sort, setSort] = useState('default');
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(new Set());

  useEffect(() => {
    if (user) {
      loadTags(user.id);
    }
  }, [user]);

  const loadTags = async (userId) => {
    const data = await getTags(userId);
    setTags(data.tags || []);
  };

  const handleLogin = (userData) => {
    saveUser(userData);
  };

  const handleLogout = () => {
    clearUser();
    setFavorites(new Set());
    setTags([]);
    setSelectedTags(new Set());
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

  const toggleTagFilter = (tagId) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
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
        <LoginForm onLogin={handleLogin} />
      )}

      <div className="search-section">
        <h2>Find Matcha Near</h2>
        <LocationSearch onLocationSelect={setCenter} />
        
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

        {tags.length > 0 && (
          <div className="tag-filters">
            <span>Filter by tag:</span>
            <div className="tag-pills">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-pill ${selectedTags.has(tag.id) ? 'active' : ''}`}
                  onClick={() => toggleTagFilter(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="buttons">
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
              <PlaceCard
                key={place.placeId}
                place={place}
                isFavorited={favorites.has(place.placeId)}
                onFavorite={handleFavorite}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
