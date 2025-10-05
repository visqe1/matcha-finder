const express = require('express');
const prisma = require('../db');
const google = require('../google');
const { sortPlaces } = require('../utils/geo');

function addPhotoUrl(place) {
  return {
    ...place,
    photoUrl: place.photoRef ? google.getPhotoUrl(place.photoRef, 400) : null,
  };
}

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
    const sorted = sortPlaces(cachedPlaces, sort, centerLat, centerLng);
    const places = sorted.map(addPhotoUrl);
    return res.json({
      places,
      center: { lat: centerLat, lng: centerLng },
      meta: { fromCache: true },
    });
  }

  const results = await google.nearbySearch(centerLat, centerLng, radiusMeters);

  // Cache results but don't overwrite rawJson if we already have detailed data
  const places = await Promise.all(
    results.map(async (r) => {
      const existing = await prisma.placeCache.findUnique({ 
        where: { placeId: r.place_id } 
      });
      const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
      
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
          // Only update rawJson if we don't have detailed data
          ...(hasDetailedData ? {} : { rawJson: r }),
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

  const sorted = sortPlaces(places, sort, centerLat, centerLng);
  const placesWithPhotos = sorted.map(addPhotoUrl);

  res.json({
    places: placesWithPhotos,
    center: { lat: centerLat, lng: centerLng },
    meta: { fromCache: false },
  });
});

// Text search for finding specific cafes by name
router.get('/cafes', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const results = await google.textSearch(q);

  // Cache results but don't overwrite rawJson if we already have detailed data
  const places = await Promise.all(
    results.slice(0, 20).map(async (r) => {
      const existing = await prisma.placeCache.findUnique({ 
        where: { placeId: r.place_id } 
      });
      const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
      
      const place = await prisma.placeCache.upsert({
        where: { placeId: r.place_id },
        update: {
          name: r.name,
          address: r.formatted_address,
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng,
          rating: r.rating,
          userRatingsTotal: r.user_ratings_total,
          priceLevel: r.price_level,
          types: r.types || [],
          photoRef: r.photos?.[0]?.photo_reference,
          // Only update rawJson if we don't have detailed data
          ...(hasDetailedData ? {} : { rawJson: r }),
        },
        create: {
          placeId: r.place_id,
          name: r.name,
          address: r.formatted_address,
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
      return addPhotoUrl(place);
    })
  );

  res.json({ places });
});

module.exports = router;

