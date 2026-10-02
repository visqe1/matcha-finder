import { useState, useEffect } from 'react';
import { searchNearby, searchCafes, autocomplete, getPlaceDetails } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';
import Icon from '../components/Icon';

const MILES_TO_METERS = 1609.34;
const RADIUS_OPTIONS = [1, 2, 5, 10, 25];
const SORT_OPTIONS = [
  { value: 'default', label: 'Best match' },
  { value: 'distance', label: 'Nearest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popularity', label: 'Most popular' },
];

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
          saveLocation(loc, 'Your location');
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
    setLoadError(data.error || null);
    setPlaces(data.places || []);
    setLoading(false);
  };

  const handleCafeSearch = async (e) => {
    e.preventDefault();
    if (!cafeQuery.trim()) return;
    
    setLoading(true);
    setSearchMode('search');
    const data = await searchCafes(cafeQuery);
    setLoadError(data.error || null);
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
        saveLocation(loc, 'Your location');
        setShowLocationSearch(false);
        setLocationQuery('');
        loadNearbyPlaces(loc.lat, loc.lng, sort, radiusMiles);
      },
      () => alert('Could not get your location')
    );
  };

  const showFilters = searchMode === 'nearby' && location;

  return (
    <div className="page">
      <Nav>
        <h1 className="hero-title">Find your next sip</h1>
        <p className="hero-subtitle">Discover matcha cafés nearby and share your favorites.</p>

        <div className="hero-search">
          <form className="cafe-search" onSubmit={handleCafeSearch}>
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Search for a matcha café..."
              aria-label="Search for a matcha café"
              value={cafeQuery}
              onChange={(e) => setCafeQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="location-picker">
            <button
              className="location-pill"
              onClick={() => setShowLocationSearch(!showLocationSearch)}
              aria-expanded={showLocationSearch}
            >
              <Icon name="pin" size={18} />
              <span className="location-text">{locationName || 'Set location'}</span>
              <Icon name="chevronDown" size={16} />
            </button>

            {showLocationSearch && (
              <div className="location-dropdown">
                <input
                  type="text"
                  className="location-input"
                  placeholder="City, neighborhood, or address"
                  value={locationQuery}
                  onChange={(e) => handleLocationInput(e.target.value)}
                  autoFocus
                />
                <button className="geo-btn" onClick={useMyLocation}>
                  <Icon name="locate" size={18} />
                  <span>Use my location</span>
                </button>
                {locationSuggestions.length > 0 && (
                  <ul className="location-suggestions">
                    {locationSuggestions.map((s) => (
                      <li key={s.placeId}>
                        <button onClick={() => selectLocation(s)}>
                          <Icon name="pin" size={16} />
                          {s.description}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="text-btn"
                  onClick={() => setShowLocationSearch(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Nav>

      <main className={`main-content discover${showFilters ? ' has-filters' : ''}`}>
        {showFilters && (
          <aside className="filters">
            <div className="filter-group">
              <p className="filter-label">Within</p>
              <div className="filter-options">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    className={`filter-option${r === radiusMiles ? ' active' : ''}`}
                    onClick={() => handleRadiusChange(r)}
                  >
                    <span>{r} {r === 1 ? 'mile' : 'miles'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <p className="filter-label">Sort by</p>
              <div className="filter-options">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    className={`filter-option${o.value === sort ? ' active' : ''}`}
                    onClick={() => handleSortChange(o.value)}
                  >
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <section className="results">
          {searchMode === 'search' && (
            <div className="search-banner">
              <p>Results for “<strong>{cafeQuery}</strong>”</p>
              <button className="text-btn" onClick={clearSearch}>
                <Icon name="close" size={16} /> Clear search
              </button>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Finding matcha spots...</p>
            </div>
          )}

          {!loading && searchMode === 'nearby' && !location && (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="map" size={28} /></span>
              <h2>Where are you sipping?</h2>
              <p>Set your location to discover matcha cafés nearby.</p>
              <button className="cta-btn" onClick={() => setShowLocationSearch(true)}>
                Set location
              </button>
            </div>
          )}

          {!loading && loadError && (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="cup" size={28} /></span>
              <h2>{loadError}</h2>
              <p>Try again in a little while.</p>
            </div>
          )}

          {!loading && !loadError && places.length === 0 && (searchMode === 'search' || location) && (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="cup" size={28} /></span>
              <h2>
                {searchMode === 'search'
                  ? 'No cafés found for that search'
                  : `No matcha spots within ${radiusMiles} ${radiusMiles === 1 ? 'mile' : 'miles'}`
                }
              </h2>
              <p>
                {searchMode === 'search'
                  ? 'Try a different search term.'
                  : 'Try expanding your search radius.'
                }
              </p>
            </div>
          )}

          {!loading && places.length > 0 && (
            <>
              <p className="results-count">
                {places.length} {places.length === 1 ? 'spot' : 'spots'} {searchMode === 'nearby' ? 'nearby' : 'found'}
              </p>
              <div className="places-grid">
                {places.map((place) => (
                  <PlaceCard key={place.placeId} place={place} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
