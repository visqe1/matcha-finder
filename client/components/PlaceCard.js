import Link from 'next/link';
import { formatDistance } from '../lib/utils';

export default function PlaceCard({ place, isFavorited, onFavorite, showDistance = true }) {
  return (
    <li className="result-item">
      <div className="result-header">
        <Link href={`/place/${place.placeId}`} className="result-name">
          {place.name}
        </Link>
        <div className="result-actions">
          {showDistance && place.distance && (
            <span className="result-distance">{formatDistance(place.distance)}</span>
          )}
          {onFavorite && (
            <button
              className={`btn-heart ${isFavorited ? 'active' : ''}`}
              onClick={() => onFavorite(place.placeId)}
            >
              {isFavorited ? '❤️' : '🤍'}
            </button>
          )}
        </div>
      </div>
      <span className="result-address">{place.address}</span>
      <div className="result-meta">
        {place.rating && (
          <span className="result-rating">⭐ {place.rating.toFixed(1)}</span>
        )}
        {place.userRatingsTotal && (
          <span className="result-reviews">({place.userRatingsTotal} reviews)</span>
        )}
      </div>
    </li>
  );
}

