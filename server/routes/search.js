const express = require('express');
const prisma = require('../db');
const google = require('../google');
const { sortPlaces } = require('../utils/geo');

const router = express.Router();

// Cache TTL in milliseconds (1 hour - photo refs can expire)
const SEARCH_CACHE_TTL = 60 * 60 * 1000;

// Helper to get photo URL from a place, checking all possible sources
function getPhotoRef(place) {
  return place.photoRef || place.rawJson?.photos?.[0]?.photo_reference;
}

function formatPlace(place) {
  const photoRef = getPhotoRef(place);
  return {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    userRatingsTotal: place.userRatingsTotal,
    priceLevel: place.priceLevel,
    types: place.types,
    distance: place.distance,
    photoUrl: photoRef ? google.getPhotoUrl(photoRef, 400) : null,
  };
}

// Fetch place details to get photos for places missing them
async function ensurePlaceHasPhotos(place) {
  const hasPhoto = getPhotoRef(place);
  if (hasPhoto) return place;

  // Fetch full details from Google to get photos
  console.log(`Fetching details for ${place.placeId} (${place.name}) - missing photos`);
  
  try {
    const details = await google.placeDetails(place.placeId);
    if (!details) return place;

    const newPhotoRef = details.photos?.[0]?.photo_reference;
    
    // Update the cache with the new photo data
    const updated = await prisma.placeCache.update({
      where: { placeId: place.placeId },
      data: {
        ...(newPhotoRef ? { photoRef: newPhotoRef } : {}),
        rawJson: details,
        phone: details.formatted_phone_number,
        website: details.website,
        openingHoursJson: details.opening_hours || null,
      },
    });
    
    return updated;
  } catch (err) {
    console.error(`Failed to fetch details for ${place.placeId}:`, err.message);
    return place;
  }
}

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

  // Check if cache is still valid (not expired)
  const cacheAge = cached ? Date.now() - new Date(cached.createdAt).getTime() : Infinity;
  const cacheValid = cached && cacheAge < SEARCH_CACHE_TTL;

  let places;

  if (cacheValid) {
    const placeIds = cached.placeIdsJson;
    places = await prisma.placeCache.findMany({
      where: { placeId: { in: placeIds } },
    });
  } else {
    // Delete stale cache entry if it exists
    if (cached && !cacheValid) {
      await prisma.placeSearchCache.delete({ where: { queryKey } }).catch(() => {});
    }

    const results = await google.nearbySearch(centerLat, centerLng, radiusMeters);

    places = await Promise.all(
      results.map(async (r) => {
        const existing = await prisma.placeCache.findUnique({ 
          where: { placeId: r.place_id } 
        });
        const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
        const newPhotoRef = r.photos?.[0]?.photo_reference;
        
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
            ...(newPhotoRef ? { photoRef: newPhotoRef } : {}),
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
            photoRef: newPhotoRef,
            rawJson: r,
          },
        });
        return place;
      })
    );

    // Cache the search results
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
  }

  // Ensure all places have photos - fetch details for those missing photos
  const placesWithPhotos = await Promise.all(
    places.map(ensurePlaceHasPhotos)
  );

  const sorted = sortPlaces(placesWithPhotos, sort, centerLat, centerLng);
  const formattedPlaces = sorted.map(formatPlace);

  res.json({
    places: formattedPlaces,
    center: { lat: centerLat, lng: centerLng },
    meta: { fromCache: cacheValid },
  });
});

// Text search for finding specific cafes by name
router.get('/cafes', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const results = await google.textSearch(q);

  // Cache results
  let places = await Promise.all(
    results.slice(0, 20).map(async (r) => {
      const existing = await prisma.placeCache.findUnique({ 
        where: { placeId: r.place_id } 
      });
      const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
      const newPhotoRef = r.photos?.[0]?.photo_reference;
      
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
          ...(newPhotoRef ? { photoRef: newPhotoRef } : {}),
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
          photoRef: newPhotoRef,
          rawJson: r,
        },
      });
      return place;
    })
  );

  // Ensure all places have photos
  places = await Promise.all(places.map(ensurePlaceHasPhotos));

  res.json({ places: places.map(formatPlace) });
});

module.exports = router;
