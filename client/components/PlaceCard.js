import { useState } from 'react';
import Link from 'next/link';

export default function PlaceCard({ place }) {
  const [imageError, setImageError] = useState(false);
  
  const formatDistance = (meters) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} mi`;
  };

  const priceLevel = place.priceLevel ? '$'.repeat(place.priceLevel) : null;
  const showImage = place.photoUrl && !imageError;

  return (
    <Link href={`/place/${place.placeId}`} className="place-card">
      <div className="place-card-image">
        {showImage ? (
          <img 
            src={place.photoUrl} 
            alt={place.name} 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="place-card-no-image">🍵</div>
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
              ⭐ {place.rating.toFixed(1)}
              <span className="rating-count">({place.userRatingsTotal})</span>
            </span>
          )}
          {priceLevel && <span className="place-card-price">{priceLevel}</span>}
        </div>
        <p className="place-card-address">{place.address}</p>
      </div>
    </Link>
  );
}
