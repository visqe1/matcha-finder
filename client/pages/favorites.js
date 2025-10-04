import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFavorites } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    setLoading(true);
    const data = await getFavorites(user.id);
    setFavorites(data.places || []);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="empty-state">
            <p className="empty-icon">❤️</p>
            <h2>Your Favorites</h2>
            <p>Log in to save your favorite matcha spots</p>
            <Link href="/login" className="cta-btn">
              Log in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Nav />
      <main className="main-content">
        <Link href="/" className="back-link">← Back to search</Link>
        <h1 className="page-title">Your Favorites</h1>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && favorites.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">💚</p>
            <p>No favorites yet</p>
            <p className="empty-hint">
              Tap the heart on any café to save it here
            </p>
            <Link href="/" className="cta-btn">
              Find cafés
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="places-grid">
            {favorites.map((place) => (
              <PlaceCard key={place.placeId} place={place} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
