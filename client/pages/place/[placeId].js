import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getPlace, toggleFavorite, checkFavorite, getLists, addToList, createList, getRecommendations, photoSrc } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';
import Nav from '../../components/Nav';
import Toast from '../../components/Toast';
import Icon from '../../components/Icon';
import LazyPhoto from '../../components/LazyPhoto';
import { matchaScore, MIN_MATCHA_SCORE } from '../../lib/matchaScore';

// Where the café page's back link goes, based on ?from= set by the page that linked here
function getBackTo(from) {
  if (from === 'favorites') return { href: '/favorites', label: 'Back to favorites' };
  const listShareId = typeof from === 'string' && from.match(/^list:([A-Za-z0-9_-]+)$/)?.[1];
  if (listShareId) return { href: `/lists/${listShareId}`, label: 'Back to list' };
  return { href: '/', label: 'Back to search' };
}

export default function PlaceDetails() {
  const router = useRouter();
  const { placeId, from } = router.query;
  const { user } = useAuth();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
  const [recsError, setRecsError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [photoScores, setPhotoScores] = useState({});
  const [avatarErrors, setAvatarErrors] = useState({});
  const [recImageErrors, setRecImageErrors] = useState({});

  useEffect(() => {
    if (placeId) {
      setImageErrors({});
      setPhotoScores({});
      setAvatarErrors({});
      setSelectedPhoto(0);
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
    setLoadError(data.place ? null : data.error || null);
    setPlace(data.place);
    setLoading(false);
  };

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    const data = await getRecommendations(placeId, 6);
    // Only the "unavailable" response carries an (empty) list; other errors keep the default text
    setRecsError(data.error && data.recommendations ? data.error : null);
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
    const result = await addToList(selectedListId, user.id, placeId);
    if (result.error) {
      setToast(result.error);
      return;
    }
    const listName = lists.find(l => l.id === selectedListId)?.title;
    setToast(`Added to "${listName}"!`);
    setSelectedListId('');
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    const data = await createList(user.id, newListName.trim());
    if (data.list) {
      const result = await addToList(data.list.id, user.id, placeId);
      setToast(result.error || `Created "${newListName}" and added!`);
      setNewListName('');
      setShowNewList(false);
      loadUserData();
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${placeId}`;
    window.open(url, '_blank');
  };

  // Opens Google's reviews panel for this place rather than the general listing
  const openGoogleReviews = () => {
    const url = `https://search.google.com/local/reviews?placeid=${placeId}`;
    window.open(url, '_blank');
  };

  const openWriteReview = () => {
    const url = `https://search.google.com/local/writereview?placeid=${placeId}`;
    window.open(url, '_blank');
  };

  const searchMenu = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(place.name + ' menu')}`;
    window.open(url, '_blank');
  };

  const handleImageError = useCallback((url) => {
    setImageErrors(prev => ({ ...prev, [url]: true }));
  }, []);

  const scorePhoto = useCallback((url, img) => {
    setPhotoScores(prev => (url in prev ? prev : { ...prev, [url]: matchaScore(img) }));
  }, []);

  const navigatePhoto = (direction, count) => {
    if (direction === 'next') {
      setSelectedPhoto((prev) => (prev + 1) % count);
    } else {
      setSelectedPhoto((prev) => (prev - 1 + count) % count);
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
            <span className="empty-icon"><Icon name="cup" size={28} /></span>
            {loadError && loadError !== 'Place not found' ? (
              <>
                <h2>{loadError}</h2>
                <p>Try again in a little while.</p>
              </>
            ) : (
              <h2>Place not found</h2>
            )}
            <Link href="/" className="cta-btn">Back to search</Link>
          </div>
        </main>
      </div>
    );
  }

  const backTo = getBackTo(from);
  const openingHours = place.openingHours?.weekday_text;
  const isOpenNow = place.openingHours?.open_now;
  const priceLevel = place.priceLevel ? '$'.repeat(place.priceLevel) : null;
  const allPhotos = (place.photos || []).map(photoSrc).filter((url) => !imageErrors[url]);
  // Lead with the most matcha-green of the photos the collage loads anyway, since
  // that's the only one phones show. Wait until all are scored so it swaps once.
  const shownPhotos = allPhotos.slice(0, 5);
  const allScored = shownPhotos.length > 1 && shownPhotos.every((url) => url in photoScores);
  const greenest = allScored
    ? shownPhotos.reduce((best, url) => (photoScores[url] > photoScores[best] ? url : best))
    : null;
  const photos =
    greenest && greenest !== allPhotos[0] && photoScores[greenest] >= MIN_MATCHA_SCORE
      ? [greenest, ...allPhotos.filter((url) => url !== greenest)]
      : allPhotos;
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
          <button className="lightbox-close" aria-label="Close photos" onClick={() => setLightboxOpen(false)}><Icon name="close" size={24} /></button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); navigatePhoto('prev', photos.length); }}>‹</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={photos[selectedPhoto]} alt={place.name} crossOrigin="anonymous" />
            <div className="lightbox-counter">{selectedPhoto + 1} / {photos.length}</div>
          </div>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); navigatePhoto('next', photos.length); }}>›</button>
        </div>
      )}

      <div className="place-page">
        <Link href={backTo.href} className="back-link place-back-link">
          <Icon name="arrowLeft" size={16} /> {backTo.label}
        </Link>
        <section className="photo-hero">
          {hasPhotos ? (
            <div className={`photo-collage photos-${Math.min(photos.length, 5)}`}>
              <div 
                className="photo-main-cell" 
                onClick={() => { setSelectedPhoto(0); setLightboxOpen(true); }}
              >
                <img
                  key={photos[0]}
                  src={photos[0]}
                  alt={place.name}
                  crossOrigin="anonymous"
                  onLoad={(e) => scorePhoto(photos[0], e.currentTarget)}
                  onError={() => handleImageError(photos[0])}
                />
                <div className="photo-overlay">
                  <span className="view-photos-btn">View all photos</span>
                </div>
              </div>
              {photos.slice(1, 5).map((photo, i) => (
                <div
                  key={photo}
                  className={`photo-cell photo-cell-${i + 1}`}
                  onClick={() => { setSelectedPhoto(i + 1); setLightboxOpen(true); }}
                >
                  <img
                    src={photo}
                    alt=""
                    crossOrigin="anonymous"
                    onLoad={(e) => scorePhoto(photo, e.currentTarget)}
                    onError={() => handleImageError(photo)}
                  />
                  {i === 3 && photos.length > 5 && (
                    <div className="photo-more-overlay">+{photos.length - 5}</div>
                  )}
                </div>
              ))}
              <button
                className={`fav-btn-hero${isFavorited ? ' active' : ''}`}
                onClick={handleFavorite}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Icon name="heart" size={22} filled={isFavorited} />
              </button>
            </div>
          ) : (
            <div className="photo-placeholder">
              <div className="placeholder-content">
                <Icon name="cup" size={40} />
                <span className="placeholder-text">No photos available</span>
              </div>
              <button
                className={`fav-btn-hero${isFavorited ? ' active' : ''}`}
                onClick={handleFavorite}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Icon name="heart" size={22} filled={isFavorited} />
              </button>
            </div>
          )}
        </section>

        <main className="place-content">

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
                    {isOpenNow ? 'Open now' : 'Closed'}
                  </span>
                )}
              </div>
              {place.categories?.length > 0 && (
                <p className="categories-list">{place.categories.join(' · ')}</p>
              )}
              {/* Inline address with directions */}
              <div className="location-inline" onClick={openInMaps}>
                <Icon name="pin" size={18} />
                <span className="location-address">{place.address}</span>
                <Icon name="arrowRight" size={16} className="location-arrow" />
              </div>
            </div>
          </header>

          {/* Quick Actions Row */}
          <section className="quick-actions-row">
            <button className="quick-action" onClick={openInMaps}>
              <span className="qa-icon" aria-hidden="true">
                <Icon name="directions" size={22} />
              </span>
              <span className="qa-label">Directions</span>
            </button>
            <button className="quick-action" onClick={handleFavorite}>
              <span className="qa-icon" aria-hidden="true">
                <Icon name="heart" size={22} filled={isFavorited} />
              </span>
              <span className="qa-label">{isFavorited ? 'Saved' : 'Save'}</span>
            </button>
            <button className="quick-action" onClick={searchMenu}>
              <span className="qa-icon" aria-hidden="true">
                <Icon name="list" size={22} />
              </span>
              <span className="qa-label">Menu</span>
            </button>
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="quick-action">
                <span className="qa-icon" aria-hidden="true">
                  <Icon name="globe" size={22} />
                </span>
                <span className="qa-label">Website</span>
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} className="quick-action">
                <span className="qa-icon" aria-hidden="true">
                  <Icon name="phone" size={22} />
                </span>
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
                See all on Google <Icon name="arrowRight" size={14} />
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
                          {review.authorPhoto && !avatarErrors[i] ? (
                            // Google's avatar server rejects requests that carry a Referer
                            <img
                              src={review.authorPhoto}
                              alt=""
                              className="reviewer-avatar"
                              referrerPolicy="no-referrer"
                              onError={() => setAvatarErrors((prev) => ({ ...prev, [i]: true }))}
                            />
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
                <span className="empty-icon"><Icon name="message" size={24} /></span>
                <p>No reviews yet</p>
                <button className="see-all-link" onClick={openWriteReview}>
                  Be the first to review on Google
                </button>
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section className="recommendations-section">
            <h2>You might also like</h2>
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
                          <LazyPhoto
                            src={photoSrc(rec.photoUrl)}
                            alt={rec.name}
                            onError={() => setRecImageErrors(prev => ({ ...prev, [rec.placeId]: true }))}
                          />
                        ) : (
                          <div className="rec-placeholder"><Icon name="cup" size={28} /></div>
                        )}
                      </div>
                      <div className="rec-info">
                        <h4 className="rec-name">{rec.name}</h4>
                        {rec.rating && (
                          <p className="rec-rating">
                            <Icon name="star" size={13} filled /> {rec.rating.toFixed(1)}
                            <span className="rec-count">({rec.userRatingsTotal})</span>
                          </p>
                        )}
                        <p className="rec-address">{rec.area || rec.address}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="no-recs">{recsError || 'No similar spots found nearby'}</p>
            )}
          </section>

          {/* Save to List */}
          {user && (
            <section className="save-section">
              <h2>Save to a list</h2>
              {lists.length > 0 && !showNewList && (
                <div className="list-add-row">
                  <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
                    <option value="">Choose a list</option>
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
                    placeholder="New list name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleCreateAndAdd} disabled={!newListName.trim()}>
                    Create and add
                  </button>
                  <button className="cancel-btn" onClick={() => setShowNewList(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="new-list-btn" onClick={() => setShowNewList(true)}>
                  <Icon name="plus" size={16} /> Create new list
                </button>
              )}
            </section>
          )}

          {!user && (
            <div className="login-prompt">
              <Link href="/login">Log in</Link> to save favorites and create lists.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
