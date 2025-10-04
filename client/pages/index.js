import { useState, useEffect } from 'react';
import { searchNearby, autocomplete, getPlaceDetails } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';

const MILES_TO_METERS = 1609.34;
const RADIUS_OPTIONS = [1, 2, 5, 10, 25]; // miles

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('default');
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('matcha_location');
    const savedLocationName = localStorage.getItem('matcha_location_name');
    const savedRadius = localStorage.getItem('matcha_radius');

    if (savedRadius) {
      setRadiusMiles(Number(savedRadius));
    }

    if (savedLocation && savedLocationName) {
      const loc = JSON.parse(savedLocation);
      setLocation(loc);
      setLocationName(savedLocationName);
      loadPlaces(loc.lat, loc.lng, 'default', savedRadius ? Number(savedRadius) : 5);
    } else {
      // No saved location - try geolocation
      tryGeolocation();
    }
  }, []);

  const tryGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          saveLocation(loc, 'Your Location');
          loadPlaces(loc.lat, loc.lng, sort, radiusMiles);
        },
        () => {
          setLoading(false);
          setShowLocationSearch(true);
        }
      );
    } else {
      setLoading(false);
      setShowLocationSearch(true);
    }
  };

  const saveLocation = (loc, name) => {
    setLocation(loc);
    setLocationName(name);
    localStorage.setItem('matcha_location', JSON.stringify(loc));
    localStorage.setItem('matcha_location_name', name);
  };

  const loadPlaces = async (lat, lng, sortBy = 'default', radius = radiusMiles) => {
    setLoading(true);
    const radiusMeters = Math.round(radius * MILES_TO_METERS);
    const data = await searchNearby(lat, lng, radiusMeters, sortBy);
    setPlaces(data.places || []);
    setLoading(false);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    if (location) {
      loadPlaces(location.lat, location.lng, newSort, radiusMiles);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadiusMiles(newRadius);
    localStorage.setItem('matcha_radius', String(newRadius));
    if (location) {
      loadPlaces(location.lat, location.lng, sort, newRadius);
    }
  };

  const handleSearchInput = async (value) => {
    setSearchQuery(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const data = await autocomplete(value);
    setSuggestions(data.predictions || []);
  };

  const selectLocation = async (suggestion) => {
    setSearchQuery('');
    setSuggestions([]);
    setShowLocationSearch(false);

    const data = await getPlaceDetails(suggestion.placeId);
    if (data.place) {
      const loc = { lat: data.place.lat, lng: data.place.lng };
      const name = suggestion.description.split(',')[0];
      saveLocation(loc, name);
      loadPlaces(loc.lat, loc.lng, sort, radiusMiles);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveLocation(loc, 'Your Location');
        setShowLocationSearch(false);
        setSearchQuery('');
        loadPlaces(loc.lat, loc.lng, sort, radiusMiles);
      },
      () => alert('Could not get your location')
    );
  };

  return (
    <div className="page">
      <Nav />

      <header className="hero">
        <h1 className="hero-title">🍵 Matcha Finder</h1>
        <p className="hero-subtitle">Discover the best matcha spots near you</p>
      </header>

      <main className="main-content">
        <div className="location-bar">
          <div className="location-display" onClick={() => setShowLocationSearch(true)}>
            <span className="location-icon">📍</span>
            <span className="location-text">
              {locationName || 'Set your location'}
            </span>
            <span className="location-change">Change</span>
          </div>

          {showLocationSearch && (
            <div className="location-dropdown">
              <input
                type="text"
                className="location-input"
                placeholder="Enter city, neighborhood, or address..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                autoFocus
              />
              <button className="geo-btn" onClick={useMyLocation}>
                📍 Use my location
              </button>
              {suggestions.length > 0 && (
                <ul className="location-suggestions">
                  {suggestions.map((s) => (
                    <li key={s.placeId} onClick={() => selectLocation(s)}>
                      {s.description}
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="close-btn"
                onClick={() => setShowLocationSearch(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {location && (
          <div className="controls">
            <div className="control-group">
              <label>Within:</label>
              <select value={radiusMiles} onChange={(e) => handleRadiusChange(Number(e.target.value))}>
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} {r === 1 ? 'mile' : 'miles'}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label>Sort:</label>
              <select value={sort} onChange={(e) => handleSortChange(e.target.value)}>
                <option value="default">Best Match</option>
                <option value="distance">Nearest</option>
                <option value="rating">Top Rated</option>
                <option value="popularity">Most Popular</option>
              </select>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Finding matcha spots...</p>
          </div>
        )}

        {!loading && !location && (
          <div className="empty-state">
            <p className="empty-icon">🗺️</p>
            <p>Set your location to discover matcha cafés nearby</p>
          </div>
        )}

        {!loading && location && places.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">😢</p>
            <p>No matcha spots found within {radiusMiles} {radiusMiles === 1 ? 'mile' : 'miles'}</p>
            <p className="empty-hint">Try expanding your search radius</p>
          </div>
        )}

        {!loading && places.length > 0 && (
          <>
            <p className="results-count">{places.length} spots found</p>
            <div className="places-grid">
              {places.map((place) => (
                <PlaceCard key={place.placeId} place={place} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
