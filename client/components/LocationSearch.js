import { useState } from 'react';
import { autocomplete, getPlaceDetails } from '../lib/api';

export default function LocationSearch({ onLocationSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleInput = async (value) => {
    setQuery(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const data = await autocomplete(value);
    setSuggestions(data.predictions || []);
  };

  const selectSuggestion = async (suggestion) => {
    setQuery(suggestion.description);
    setSuggestions([]);
    
    const data = await getPlaceDetails(suggestion.placeId);
    if (data.place) {
      onLocationSelect({
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
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'My Location',
        };
        setQuery('My Location');
        onLocationSelect(location);
      },
      () => alert('Could not get location')
    );
  };

  return (
    <div className="location-search">
      <div className="autocomplete-wrapper">
        <input
          type="text"
          className="input input-wide"
          placeholder="Search for a location..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
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
      <button className="btn btn-primary" onClick={useMyLocation}>
        Use My Location
      </button>
    </div>
  );
}

