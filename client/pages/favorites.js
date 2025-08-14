import { useState, useEffect } from 'react';
import { getFavorites, toggleFavorite } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';

export default function Favorites() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    if (user) {
      loadFavorites(user.id);
    }
  }, [user]);

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
            <PlaceCard
              key={place.placeId}
              place={place}
              isFavorited={true}
              onFavorite={handleUnfavorite}
              showDistance={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
