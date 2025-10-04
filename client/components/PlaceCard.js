import Link from 'next/link';

export default function PlaceCard({ place }) {
  const formatDistance = (meters) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <Link href={`/place/${place.placeId}`} className="place-card">
      <div className="place-card-content">
        <h3 className="place-card-name">{place.name}</h3>
        <p className="place-card-address">{place.address}</p>
        <div className="place-card-meta">
          {place.rating && (
            <span className="place-card-rating">
              ⭐ {place.rating.toFixed(1)}
              {place.userRatingsTotal && (
                <span className="rating-count">({place.userRatingsTotal})</span>
              )}
            </span>
          )}
          {place.distance && (
            <span className="place-card-distance">
              {formatDistance(place.distance)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
