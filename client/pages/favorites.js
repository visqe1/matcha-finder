import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFavorites, toggleFavorite } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import PlaceCard from '../components/PlaceCard';
import Toast from '../components/Toast';
import Icon from '../components/Icon';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState(null);

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

  const handleUnfavorite = async (place) => {
    setRemoving(place.placeId);
    const data = await toggleFavorite(user.id, place.placeId);
    setRemoving(null);
    if (data.isFavorited === false) {
      setFavorites((prev) => prev.filter((p) => p.placeId !== place.placeId));
      setToast(`Removed ${place.name} from favorites`);
    } else {
      // The toggle re-added it (it wasn't favorited server-side); undo that
      if (data.isFavorited) await toggleFavorite(user.id, place.placeId);
      setToast('Could not update favorites');
    }
  };

  if (!user) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="empty-state">
            <span className="empty-icon"><Icon name="heart" size={28} /></span>
            <h2>Your favorites</h2>
            <p>Log in to save your favorite matcha spots.</p>
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
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <main className="main-content">
        <Link href="/" className="back-link"><Icon name="arrowLeft" size={16} /> Back to search</Link>
        <h1 className="page-title">Your favorites</h1>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && favorites.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="heart" size={28} /></span>
            <h2>No favorites yet</h2>
            <p>Tap the heart on any café to save it here.</p>
            <Link href="/" className="cta-btn">
              Find cafés
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="places-grid">
            {favorites.map((place) => (
              <PlaceCard
                key={place.placeId}
                place={place}
                from="favorites"
                action={
                  <button
                    className="card-action-btn"
                    aria-label={`Remove ${place.name} from favorites`}
                    title="Remove from favorites"
                    disabled={removing === place.placeId}
                    onClick={() => handleUnfavorite(place)}
                  >
                    <Icon name="heart" size={18} filled />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
