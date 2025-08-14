function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sortPlaces(places, sort, centerLat, centerLng) {
  const withDistance = places.map((p) => ({
    ...p,
    distance: haversineDistance(centerLat, centerLng, p.lat, p.lng),
  }));

  if (sort === 'distance') {
    withDistance.sort((a, b) => a.distance - b.distance);
  } else if (sort === 'rating') {
    withDistance.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'popularity') {
    withDistance.sort((a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0));
  } else {
    withDistance.sort((a, b) => {
      const scoreA = (a.rating || 0) * Math.log(1 + (a.userRatingsTotal || 0));
      const scoreB = (b.rating || 0) * Math.log(1 + (b.userRatingsTotal || 0));
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.distance - b.distance;
    });
  }

  return withDistance;
}

module.exports = { haversineDistance, sortPlaces };

