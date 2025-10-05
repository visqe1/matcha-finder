const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

async function fetchAndCachePlaceDetails(placeId) {
  const details = await google.placeDetails(placeId);
  if (!details) return null;

  const cached = await prisma.placeCache.upsert({
    where: { placeId },
    update: {
      name: details.name,
      address: details.formatted_address,
      lat: details.geometry?.location?.lat,
      lng: details.geometry?.location?.lng,
      rating: details.rating,
      userRatingsTotal: details.user_ratings_total,
      priceLevel: details.price_level,
      types: details.types || [],
      photoRef: details.photos?.[0]?.photo_reference,
      phone: details.formatted_phone_number,
      website: details.website,
      openingHoursJson: details.opening_hours || null,
      rawJson: details,
    },
    create: {
      placeId,
      name: details.name,
      address: details.formatted_address,
      lat: details.geometry?.location?.lat,
      lng: details.geometry?.location?.lng,
      rating: details.rating,
      userRatingsTotal: details.user_ratings_total,
      priceLevel: details.price_level,
      types: details.types || [],
      photoRef: details.photos?.[0]?.photo_reference,
      phone: details.formatted_phone_number,
      website: details.website,
      openingHoursJson: details.opening_hours || null,
      rawJson: details,
    },
  });

  return cached;
}

function enrichPlace(place) {
  const raw = place.rawJson || {};
  
  // Get multiple photo URLs (up to 6)
  const photos = (raw.photos || []).slice(0, 6).map((p) => 
    google.getPhotoUrl(p.photo_reference, 800)
  );

  // Get reviews
  const reviews = (raw.reviews || []).map((r) => ({
    author: r.author_name,
    authorPhoto: r.profile_photo_url,
    rating: r.rating,
    text: r.text,
    time: r.relative_time_description,
  }));

  // Get description/summary
  const description = raw.editorial_summary?.overview || null;

  // Format types nicely
  const categories = (place.types || [])
    .filter(t => !['point_of_interest', 'establishment'].includes(t))
    .slice(0, 3)
    .map(t => t.replace(/_/g, ' '));

  return {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    userRatingsTotal: place.userRatingsTotal,
    priceLevel: place.priceLevel,
    phone: place.phone,
    website: place.website,
    openingHours: place.openingHoursJson,
    description,
    categories,
    photos,
    reviews,
    photoUrl: photos[0] || null,
  };
}

router.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.json({ predictions: [] });
  }
  
  const predictions = await google.placeAutocomplete(input);
  res.json({
    predictions: predictions.map(p => ({
      description: p.description,
      placeId: p.place_id,
    })),
  });
});

router.get('/details/:placeId', async (req, res) => {
  const { placeId } = req.params;
  
  const place = await fetchAndCachePlaceDetails(placeId);
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  res.json({ place: enrichPlace(place) });
});

router.get('/:placeId', async (req, res) => {
  const { placeId } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  let place = await prisma.placeCache.findUnique({ where: { placeId } });

  const raw = place?.rawJson;
  const hasPhotos = raw && Array.isArray(raw.photos) && raw.photos.length > 0;
  const hasReviews = raw && Array.isArray(raw.reviews);
  const hasDetailedFields = raw && (raw.formatted_phone_number || raw.editorial_summary);
  
  const hasFullData = hasPhotos && (hasReviews || hasDetailedFields);
  
  const needsFullDetails = forceRefresh || !place || !hasFullData;

  if (needsFullDetails) {
    console.log(`Fetching full details for ${placeId} (forceRefresh=${forceRefresh}, hasFullData=${hasFullData}, hasPhotos=${hasPhotos}, hasReviews=${hasReviews})`);
    place = await fetchAndCachePlaceDetails(placeId);
  }

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  res.json({ place: enrichPlace(place) });
});

// Get nearby matcha recommendations (similar places)
router.get('/:placeId/recommendations', async (req, res) => {
  const { placeId } = req.params;
  const { limit = 6 } = req.query;

  // Get the current place to find its location
  let place = await prisma.placeCache.findUnique({ where: { placeId } });
  
  if (!place) {
    place = await fetchAndCachePlaceDetails(placeId);
  }

  if (!place || !place.lat || !place.lng) {
    return res.status(404).json({ error: 'Place not found or missing location' });
  }

  const results = await google.nearbySearch(place.lat, place.lng, 3000);

  // Filter out the current place and cache results
  // IMPORTANT: Don't overwrite rawJson if it already has detailed data (reviews)
  const recommendations = await Promise.all(
    results
      .filter((r) => r.place_id !== placeId)
      .slice(0, parseInt(limit))
      .map(async (r) => {
        // Check if we already have detailed data for this place
        const existing = await prisma.placeCache.findUnique({ 
          where: { placeId: r.place_id } 
        });
        const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
        
        const cached = await prisma.placeCache.upsert({
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
        return {
          placeId: cached.placeId,
          name: cached.name,
          address: cached.address,
          rating: cached.rating,
          userRatingsTotal: cached.userRatingsTotal,
          priceLevel: cached.priceLevel,
          photoUrl: cached.photoRef ? google.getPhotoUrl(cached.photoRef, 400) : null,
        };
      })
  );

  res.json({ recommendations });
});

module.exports = router;
