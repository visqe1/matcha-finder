import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getPlace, toggleFavorite, checkFavorite, getLists, addToList, createList, getRecommendations } from '../../lib/api';
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
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [recImageErrors, setRecImageErrors] = useState({});

  useEffect(() => {
    if (placeId) {
      loadPlace();
      loadRecommendations();
    }
  }, [placeId]);

  useEffect(() => {
    if (user && placeId) {
      loadUserData();
    }
  }, [user, placeId]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const loadPlace = async () => {
    setLoading(true);
    const data = await getPlace(placeId);
    setPlace(data.place);
    setLoading(false);
  };

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    const data = await getRecommendations(placeId, 6);
    setRecommendations(data.recommendations || []);
    setLoadingRecs(false);
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

  const openGoogleReviews = () => {
    const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    window.open(url, '_blank');
  };

  const searchMenu = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(place.name + ' menu')}`;
    window.open(url, '_blank');
  };

  const handleImageError = useCallback((index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  }, []);

  const navigatePhoto = (direction) => {
    const photos = place?.photos || [];
    if (direction === 'next') {
      setSelectedPhoto((prev) => (prev + 1) % photos.length);
    } else {
      setSelectedPhoto((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading place details...</p>
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

  const openingHours = place.openingHours?.weekday_text;
  const isOpenNow = place.openingHours?.open_now;
  const priceLevel = place.priceLevel ? '$'.repeat(place.priceLevel) : null;
  const photos = (place.photos || []).filter((_, i) => !imageErrors[i]);
  const reviews = place.reviews || [];
  const hasPhotos = photos.length > 0;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star filled">★</span>);
      } else if (i === fullStars && hasHalf) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">★</span>);
      }
    }
    return stars;
  };

  return (
    <div className="page">
      <Nav />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {lightboxOpen && hasPhotos && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>×</button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); navigatePhoto('prev'); }}>‹</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={photos[selectedPhoto]} alt={place.name} />
            <div className="lightbox-counter">{selectedPhoto + 1} / {photos.length}</div>
          </div>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); navigatePhoto('next'); }}>›</button>
        </div>
      )}

      <div className="place-page">
        <section className="photo-hero">
          {hasPhotos ? (
            <div className={`photo-collage photos-${Math.min(photos.length, 5)}`}>
              <div 
                className="photo-main-cell" 
                onClick={() => { setSelectedPhoto(0); setLightboxOpen(true); }}
              >
                <img 
                  src={photos[0]} 
                  alt={place.name}
                  onError={() => handleImageError(0)}
                />
                <div className="photo-overlay">
                  <span className="view-photos-btn">View all photos</span>
                </div>
              </div>
              {photos.slice(1, 5).map((photo, i) => (
                <div 
                  key={i + 1} 
                  className={`photo-cell photo-cell-${i + 1}`}
                  onClick={() => { setSelectedPhoto(i + 1); setLightboxOpen(true); }}
                >
                  <img 
                    src={photo} 
                    alt=""
                    onError={() => handleImageError(i + 1)}
                  />
                  {i === 3 && photos.length > 5 && (
                    <div className="photo-more-overlay">+{photos.length - 5}</div>
                  )}
                </div>
              ))}
              <button className="fav-btn-hero" onClick={handleFavorite}>
                <img
                  className="fav-icon"
                  src={isFavorited ? "/heart-icon.png" : "/unheart-icon.png"}
                  alt=""
                />
              </button>
            </div>
          ) : (
            <div className="photo-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">🍵</span>
                <span className="placeholder-text">No photos available</span>
              </div>
              <button className="fav-btn-hero" onClick={handleFavorite}>
                {isFavorited ? '❤️' : '🤍'}
              </button>
            </div>
          )}
        </section>

        <main className="place-content">
          <Link href="/" className="back-link">← Back to search</Link>

          {/* Header Section */}
          <header className="place-header">
            <div className="place-title-section">
              <h1>{place.name}</h1>
              <div className="place-badges">
                {place.rating && (
                  <div className="rating-display" onClick={openGoogleReviews} title="View on Google">
                    <div className="stars">{renderStars(place.rating)}</div>
                    <span className="rating-number">{place.rating.toFixed(1)}</span>
                    <span className="rating-count">({place.userRatingsTotal} reviews)</span>
                  </div>
                )}
                {priceLevel && <span className="price-indicator">{priceLevel}</span>}
                {isOpenNow !== undefined && (
                  <span className={`open-status ${isOpenNow ? 'open' : 'closed'}`}>
                    {isOpenNow ? '● Open Now' : '● Closed'}
                  </span>
                )}
              </div>
              {place.categories?.length > 0 && (
                <p className="categories-list">{place.categories.join(' · ')}</p>
              )}
              {/* Inline address with directions */}
              <div className="location-inline" onClick={openInMaps}>
                <span className="location-pin">
                  <img className="pin-icon" src="/location-icon.PNG" alt="" />
                </span>
                <span className="location-address">{place.address}</span>
                <span className="location-arrow">→</span>
              </div>
            </div>
          </header>

          {/* Quick Actions Row */}
          <section className="quick-actions-row">
            <button className="quick-action" onClick={openInMaps}>
              <span className="qa-icon">🗺️</span>
              <span className="qa-label">Directions</span>
            </button>
            <button className="quick-action" onClick={handleFavorite}>
              <span className="qa-icon" aria-hidden="true">
                <img
                  className="qa-icon-img"
                  src={isFavorited ? "/heart-icon.png" : "/unheart-icon.png"}
                  alt=""
                />
              </span>
              <span className="qa-label">{isFavorited ? 'Saved' : 'Save'}</span>
            </button>
            <button className="quick-action" onClick={searchMenu}>
              <span className="qa-icon">📋</span>
              <span className="qa-label">Menu</span>
            </button>
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="quick-action">
                <span className="qa-icon">🌐</span>
                <span className="qa-label">Website</span>
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} className="quick-action">
                <span className="qa-icon">📞</span>
                <span className="qa-label">Call</span>
              </a>
            )}
          </section>

          {/* About & Hours Grid */}
          <section className="info-grid">
            {/* Description / About */}
            {place.description && (
              <div className="info-card about-card">
                <h3>About</h3>
                <p>{place.description}</p>
              </div>
            )}
            
            {/* Hours */}
            {openingHours && (
              <div className="info-card hours-card">
                <h3>Hours</h3>
                <ul className="hours-list">
                  {openingHours.map((line, i) => {
                    const [day, hours] = line.split(': ');
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                    return (
                      <li key={i} className={isToday ? 'today' : ''}>
                        <span className="day">{day}</span>
                        <span className="hours">{hours}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* Reviews Section */}
          <section className="reviews-section">
            <div className="section-header">
              <h2>Reviews</h2>
              <button className="see-all-link" onClick={openGoogleReviews}>
                See all on Google →
              </button>
            </div>
            
            {reviews.length > 0 ? (
              <>
                {/* Review Summary */}
                <div className="reviews-summary">
                  <div className="summary-score">
                    <span className="big-rating">{place.rating?.toFixed(1)}</span>
                    <div className="summary-stars">{renderStars(place.rating || 0)}</div>
                    <span className="total-reviews">{place.userRatingsTotal} reviews</span>
                  </div>
                </div>

                <div className="reviews-grid">
                  {reviews.slice(0, 3).map((review, i) => (
                    <article key={i} className="review-card">
                      <header className="review-header">
                        <div className="reviewer-info">
                          {review.authorPhoto ? (
                            <img src={review.authorPhoto} alt="" className="reviewer-avatar" />
                          ) : (
                            <div className="reviewer-avatar-placeholder">
                              {review.author?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="reviewer-name">{review.author}</p>
                            <p className="review-date">{review.time}</p>
                          </div>
                        </div>
                        <div className="review-rating">
                          {renderStars(review.rating)}
                        </div>
                      </header>
                      {review.text && (
                        <p className="review-text">{review.text}</p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-reviews">
                <p className="no-reviews-icon">💬</p>
                <p>No reviews yet</p>
                <button className="see-all-link" onClick={openGoogleReviews}>
                  Be the first to review on Google
                </button>
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section className="recommendations-section">
            <h2>Similar Matcha Spots Nearby</h2>
            {loadingRecs ? (
              <div className="recs-loading">
                <div className="spinner small"></div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="recs-scroll">
                {recommendations.map((rec) => {
                  const showRecImage = rec.photoUrl && !recImageErrors[rec.placeId];
                  return (
                    <Link key={rec.placeId} href={`/place/${rec.placeId}`} className="rec-card">
                      <div className="rec-image">
                        {showRecImage ? (
                          <img 
                            src={rec.photoUrl} 
                            alt={rec.name}
                            onError={() => setRecImageErrors(prev => ({ ...prev, [rec.placeId]: true }))}
                          />
                        ) : (
                          <div className="rec-placeholder">🍵</div>
                        )}
                      </div>
                      <div className="rec-info">
                        <h4 className="rec-name">{rec.name}</h4>
                        {rec.rating && (
                          <p className="rec-rating">
                            ⭐ {rec.rating.toFixed(1)}
                            <span className="rec-count">({rec.userRatingsTotal})</span>
                          </p>
                        )}
                        <p className="rec-address">{rec.address}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="no-recs">No similar spots found nearby</p>
            )}
          </section>

          {/* Save to List */}
          {user && (
            <section className="save-section">
              <h2>Save to List</h2>
              {lists.length > 0 && !showNewList && (
                <div className="list-add-row">
                  <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
                    <option value="">Choose a list...</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.title}</option>
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
            </section>
          )}

          {!user && (
            <div className="login-prompt">
              <Link href="/login">Log in</Link> to save favorites and create lists
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
