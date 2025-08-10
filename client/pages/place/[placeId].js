import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPlace, toggleFavorite } from '../../lib/api';
import Nav from '../../components/Nav';

export default function PlaceDetails() {
  const router = useRouter();
  const { placeId } = router.query;
  const [place, setPlace] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (placeId) {
      loadPlace();
    }
  }, [placeId]);

  const loadPlace = async () => {
    const data = await getPlace(placeId);
    setPlace(data.place);
  };

  const handleFavorite = async () => {
    if (!user) {
      alert('Please login to favorite places');
      return;
    }
    const data = await toggleFavorite(user.id, placeId);
    setIsFavorited(data.isFavorited);
  };

  if (!place) {
    return (
      <div className="container">
        <Nav />
        <p>Loading...</p>
      </div>
    );
  }

  const openingHours = place.openingHoursJson?.weekday_text;

  return (
    <div className="container">
      <Nav />
      <div className="place-header">
        <h1 className="title">{place.name}</h1>
        <button
          className={`btn-heart-lg ${isFavorited ? 'active' : ''}`}
          onClick={handleFavorite}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="place-details">
        <p className="place-address">📍 {place.address}</p>

        {place.rating && (
          <p className="place-rating">
            ⭐ {place.rating.toFixed(1)} ({place.userRatingsTotal} reviews)
          </p>
        )}

        {place.phone && (
          <p className="place-contact">
            📞 <a href={`tel:${place.phone}`}>{place.phone}</a>
          </p>
        )}

        {place.website && (
          <p className="place-contact">
            🌐 <a href={place.website} target="_blank" rel="noopener noreferrer">
              {place.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </p>
        )}

        {openingHours && (
          <div className="place-hours">
            <h3>Hours</h3>
            <ul>
              {openingHours.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

