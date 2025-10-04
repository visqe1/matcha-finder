import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getPlace, toggleFavorite, checkFavorite, getLists, addToList, createList } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';
import Nav from '../../components/Nav';
import Toast from '../../components/Toast';

export default function PlaceDetails() {
  const router = useRouter();
  const { placeId } = router.query;
  const { user } = useAuth();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (placeId) {
      loadPlace();
    }
  }, [placeId]);

  useEffect(() => {
    if (user && placeId) {
      loadUserData();
    }
  }, [user, placeId]);

  const loadPlace = async () => {
    setLoading(true);
    const data = await getPlace(placeId);
    setPlace(data.place);
    setLoading(false);
  };

  const loadUserData = async () => {
    const [favData, listsData] = await Promise.all([
      checkFavorite(user.id, placeId),
      getLists(user.id),
    ]);
    setIsFavorited(favData.isFavorited);
    setLists(listsData.lists || []);
  };

  const handleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    const data = await toggleFavorite(user.id, placeId);
    setIsFavorited(data.isFavorited);
    setToast(data.isFavorited ? 'Added to favorites!' : 'Removed from favorites');
  };

  const handleAddToList = async () => {
    if (!selectedListId) return;
    await addToList(selectedListId, placeId);
    const listName = lists.find(l => l.id === selectedListId)?.title;
    setToast(`Added to "${listName}"!`);
    setSelectedListId('');
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    const data = await createList(user.id, newListName.trim());
    if (data.list) {
      await addToList(data.list.id, placeId);
      setToast(`Created "${newListName}" and added!`);
      setNewListName('');
      setShowNewList(false);
      loadUserData();
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${placeId}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="empty-state">
            <p className="empty-icon">😕</p>
            <p>Place not found</p>
            <Link href="/" className="back-link">← Back to search</Link>
          </div>
        </main>
      </div>
    );
  }

  const openingHours = place.openingHoursJson?.weekday_text;
  const isOpenNow = place.openingHoursJson?.open_now;
  const priceLevel = place.priceLevel ? '$'.repeat(place.priceLevel) : null;

  return (
    <div className="page">
      <Nav />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <main className="main-content">
        <Link href="/" className="back-link">← Back to search</Link>

        {place.photoUrl && (
          <div className="place-hero">
            <img src={place.photoUrl} alt={place.name} className="place-hero-img" />
          </div>
        )}

        <div className="place-detail">
          <div className="place-detail-header">
            <div className="place-detail-title">
              <h1>{place.name}</h1>
              <div className="place-badges">
                {isOpenNow !== undefined && (
                  <span className={`badge ${isOpenNow ? 'badge-open' : 'badge-closed'}`}>
                    {isOpenNow ? 'Open Now' : 'Closed'}
                  </span>
                )}
                {priceLevel && <span className="badge badge-price">{priceLevel}</span>}
              </div>
            </div>
            <button
              className={`fav-btn-large ${isFavorited ? 'active' : ''}`}
              onClick={handleFavorite}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited ? '❤️' : '🤍'}
            </button>
          </div>

          {place.rating && (
            <div className="place-rating-large">
              <span className="rating-stars">{'⭐'.repeat(Math.round(place.rating))}</span>
              <span className="rating-value">{place.rating.toFixed(1)}</span>
              {place.userRatingsTotal && (
                <span className="rating-count">({place.userRatingsTotal} reviews)</span>
              )}
            </div>
          )}

          <p className="place-address-large">📍 {place.address}</p>

          <div className="place-actions">
            <button className="action-btn primary" onClick={openInMaps}>
              🗺️ Open in Maps
            </button>
            {place.phone && (
              <a href={`tel:${place.phone}`} className="action-btn">
                📞 Call
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="action-btn">
                🌐 Website
              </a>
            )}
          </div>

          {openingHours && (
            <div className="place-section">
              <h3>Hours</h3>
              <ul className="hours-list">
                {openingHours.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {user && (
            <div className="place-section">
              <h3>Save to List</h3>
              {lists.length > 0 && !showNewList && (
                <div className="list-add-row">
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                  >
                    <option value="">Choose a list...</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleAddToList} disabled={!selectedListId} className="add-btn">
                    Add
                  </button>
                </div>
              )}
              
              {showNewList ? (
                <div className="new-list-form">
                  <input
                    type="text"
                    placeholder="List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleCreateAndAdd} disabled={!newListName.trim()}>
                    Create & Add
                  </button>
                  <button className="cancel-btn" onClick={() => setShowNewList(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="new-list-btn" onClick={() => setShowNewList(true)}>
                  + Create new list
                </button>
              )}
            </div>
          )}

          {!user && (
            <div className="login-prompt">
              <Link href="/login">Log in</Link> to save to favorites and lists
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
