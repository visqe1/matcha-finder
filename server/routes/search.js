const express = require('express');
const prisma = require('../db');
const google = require('../google');
const { sortPlaces } = require('../utils/geo');

const router = express.Router();

router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 3000, sort = 'default' } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const radiusMeters = parseInt(radius);
  const keyword = 'matcha';

  const queryKey = `${centerLat.toFixed(3)},${centerLng.toFixed(3)},${radiusMeters},${keyword}`;

  const cached = await prisma.placeSearchCache.findUnique({ where: { queryKey } });

  if (cached) {
    const placeIds = cached.placeIdsJson;
    const cachedPlaces = await prisma.placeCache.findMany({
      where: { placeId: { in: placeIds } },
    });
    const places = sortPlaces(cachedPlaces, sort, centerLat, centerLng);
    return res.json({
      places,
      center: { lat: centerLat, lng: centerLng },
      meta: { fromCache: true },
    });
  }

  const results = await google.nearbySearch(centerLat, centerLng, radiusMeters);

  const places = await Promise.all(
    results.map(async (r) => {
      const place = await prisma.placeCache.upsert({
        where: { placeId: r.place_id },
        update: {
          name: r.name,
          address: r.vicinity,
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng,
          rating: r.rating,
          userRatingsTotal: r.user_ratings_total,
          priceLevel: r.price_level,
          types: r.types || [],
          photoRef: r.photos?.[0]?.photo_reference,
          rawJson: r,
        },
        create: {
          placeId: r.place_id,
          name: r.name,
          address: r.vicinity,
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng,
          rating: r.rating,
          userRatingsTotal: r.user_ratings_total,
          priceLevel: r.price_level,
          types: r.types || [],
          photoRef: r.photos?.[0]?.photo_reference,
          rawJson: r,
        },
      });
      return place;
    })
  );

  const placeIds = places.map((p) => p.placeId);
  await prisma.placeSearchCache.create({
    data: {
      queryKey,
      centerLat,
      centerLng,
      radiusMeters,
      keyword,
      placeIdsJson: placeIds,
    },
  });

  const sortedPlaces = sortPlaces(places, sort, centerLat, centerLng);

  res.json({
    places: sortedPlaces,
    center: { lat: centerLat, lng: centerLng },
    meta: { fromCache: false },
  });
});

module.exports = router;

