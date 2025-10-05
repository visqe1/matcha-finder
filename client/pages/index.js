import { useState, useEffect } from 'react';
import { searchNearby, searchCafes, autocomplete, getPlaceDetails } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';

const MILES_TO_METERS = 1609.34;
const RADIUS_OPTIONS = [1, 2, 5, 10, 25];

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('default');
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  
  // Cafe search state
  const [cafeQuery, setCafeQuery] = useState('');
  const [searchMode, setSearchMode] = useState('nearby'); // 'nearby' or 'search'

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
      loadNearbyPlaces(loc.lat, loc.lng, 'default', savedRadius ? Number(savedRadius) : 5);
    } else {
      tryGeolocation();
    }
  }, []);

  const tryGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          saveLocation(loc, 'Your Location');
          loadNearbyPlaces(loc.lat, loc.lng, sort, radiusMiles);
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

  const loadNearbyPlaces = async (lat, lng, sortBy = 'default', radius = radiusMiles) => {
    setLoading(true);
    setSearchMode('nearby');
    const radiusMeters = Math.round(radius * MILES_TO_METERS);
    const data = await searchNearby(lat, lng, radiusMeters, sortBy);
    setPlaces(data.places || []);
    setLoading(false);
  };

  const handleCafeSearch = async (e) => {
    e.preventDefault();
    if (!cafeQuery.trim()) return;
    
    setLoading(true);
    setSearchMode('search');
    const data = await searchCafes(cafeQuery);
    setPlaces(data.places || []);
    setLoading(false);
  };

  const clearSearch = () => {
    setCafeQuery('');
    setSearchMode('nearby');
    if (location) {
      loadNearbyPlaces(location.lat, location.lng, sort, radiusMiles);
    }
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    if (location && searchMode === 'nearby') {
      loadNearbyPlaces(location.lat, location.lng, newSort, radiusMiles);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadiusMiles(newRadius);
    localStorage.setItem('matcha_radius', String(newRadius));
    if (location && searchMode === 'nearby') {
      loadNearbyPlaces(location.lat, location.lng, sort, newRadius);
    }
  };

  const handleLocationInput = async (value) => {
    setLocationQuery(value);
    if (value.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const data = await autocomplete(value);
    setLocationSuggestions(data.predictions || []);
  };

  const selectLocation = async (suggestion) => {
    setLocationQuery('');
    setLocationSuggestions([]);
    setShowLocationSearch(false);

    const data = await getPlaceDetails(suggestion.placeId);
    if (data.place) {
      const loc = { lat: data.place.lat, lng: data.place.lng };
      const name = suggestion.description.split(',')[0];
      saveLocation(loc, name);
      loadNearbyPlaces(loc.lat, loc.lng, sort, radiusMiles);
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
        setLocationQuery('');
        loadNearbyPlaces(loc.lat, loc.lng, sort, radiusMiles);
      },
      () => alert('Could not get your location')
    );
  };

  return (
    <div className="page">
      <Nav />

      <header className="hero">
        <h1 className="hero-title">🍵 Matcha Finder</h1>
        <p className="hero-subtitle">Discover the best matcha spots</p>
        
        {/* Cafe Search Bar */}
        <form className="cafe-search" onSubmit={handleCafeSearch}>
          <input
            type="text"
            placeholder="Search for a matcha café..."
            value={cafeQuery}
            onChange={(e) => setCafeQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      <main className="main-content">
        {/* Search results banner */}
        {searchMode === 'search' && (
          <div className="search-banner">
            <p>Showing results for "<strong>{cafeQuery}</strong>"</p>
            <button onClick={clearSearch}>× Clear search</button>
          </div>
        )}

        {/* Location bar - only show in nearby mode */}
        {searchMode === 'nearby' && (
          <>
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
                    value={locationQuery}
                    onChange={(e) => handleLocationInput(e.target.value)}
                    autoFocus
                  />
                  <button className="geo-btn" onClick={useMyLocation}>
                    📍 Use my location
                  </button>
                  {locationSuggestions.length > 0 && (
                    <ul className="location-suggestions">
                      {locationSuggestions.map((s) => (
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
          </>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Finding matcha spots...</p>
          </div>
        )}

        {!loading && searchMode === 'nearby' && !location && (
          <div className="empty-state">
            <p className="empty-icon">🗺️</p>
            <p>Set your location to discover matcha cafés nearby</p>
          </div>
        )}

        {!loading && places.length === 0 && (searchMode === 'search' || location) && (
          <div className="empty-state">
            <p className="empty-icon">😢</p>
            <p>
              {searchMode === 'search' 
                ? 'No cafés found for that search' 
                : `No matcha spots found within ${radiusMiles} ${radiusMiles === 1 ? 'mile' : 'miles'}`
              }
            </p>
            <p className="empty-hint">
              {searchMode === 'search' 
                ? 'Try a different search term' 
                : 'Try expanding your search radius'
              }
            </p>
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
