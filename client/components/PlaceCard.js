import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import LazyPhoto from './LazyPhoto';
import { photoSrc } from '../lib/api';

// `action` is an optional button (e.g. unfavorite, remove from list) shown on the
// photo. It sits beside the link, not inside it, so clicking it doesn't open the café.
// `from` (e.g. "favorites", "list:abc123") tells the café page where "back" goes.
export default function PlaceCard({ place, action, from }) {
  const [imageError, setImageError] = useState(false);

  const formatDistance = (meters) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} mi`;
  };

  const priceLevel = place.priceLevel ? '$'.repeat(place.priceLevel) : null;
  const showImage = place.photoUrl && !imageError;

  const card = (
    <Link
      href={from ? `/place/${place.placeId}?from=${encodeURIComponent(from)}` : `/place/${place.placeId}`}
      className="place-card"
    >
      <div className="place-card-image">
        {showImage ? (
          <LazyPhoto
            src={photoSrc(place.photoUrl)}
            alt={place.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="place-card-no-image">
            <Icon name="cup" size={32} />
          </div>
        )}
        {place.distance && (
          <span className="place-card-distance-badge">
            {formatDistance(place.distance)}
          </span>
        )}
      </div>
      <div className="place-card-content">
        <h3 className="place-card-name">{place.name}</h3>
        <div className="place-card-meta">
          {place.rating && (
            <span className="place-card-rating">
              <Icon name="star" size={13} filled />
              {place.rating.toFixed(1)}
              <span className="rating-count">({place.userRatingsTotal})</span>
            </span>
          )}
          {priceLevel && <span className="place-card-price">{priceLevel}</span>}
        </div>
        <p className="place-card-address">{place.address}</p>
      </div>
    </Link>
  );

  if (!action) return card;
  return (
    <div className="place-card-wrap">
      {card}
      {action}
    </div>
  );
}
