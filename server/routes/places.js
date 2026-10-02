const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

// Google photo references expire, so full details (photos, hours, reviews) are
// refetched once they're older than this. Searches upsert the same row without
// touching rawJson, so updatedAt can't be used; the fetch time lives in rawJson.
const DETAILS_TTL = 60 * 60 * 1000;

// "You might also like" only stores place IDs (which Google allows keeping), so
// the list can live much longer than other cached Google data.
const RECS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const RECS_RADIUS_METERS = 3000;

function withFetchedAt(details) {
  return { ...details, _fetchedAt: Date.now() };
}

function detailsAreFresh(raw) {
  return Boolean(raw?._fetchedAt) && Date.now() - raw._fetchedAt < DETAILS_TTL;
}

// Helper to get photo URL from a place, checking all possible sources
function getPhotoRef(place) {
  return place.photoRef || place.rawJson?.photos?.[0]?.photo_reference;
}

// Short "where is it" label for a place, e.g. "Allston, Boston". Neighborhoods
// come from address components (only present after a details fetch); otherwise
// it's just the town from the address text.
function getArea(place) {
  const components = place.rawJson?.address_components || [];
  const find = (type) => components.find((c) => c.types?.includes(type))?.long_name;
  const city = find('locality') || find('sublocality_level_1') || townFromAddress(place.address);
  const neighborhood = find('neighborhood');
  return neighborhood && neighborhood !== city ? `${neighborhood}, ${city}` : city;
}

// "10 Milk St, Boston, MA 02108, USA" and "54 Bond St, New York" -> the town
function townFromAddress(address) {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (/^(USA|United States)$/.test(parts[parts.length - 1])) parts.pop();
  if (/^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/.test(parts[parts.length - 1])) parts.pop();
  return parts.length > 1 ? parts[parts.length - 1] : address;
}

async function fetchAndCachePlaceDetails(placeId) {
  const details = await google.placeDetails(placeId);
  if (!details) return null;

  // Only update photoRef if we have a new one - don't overwrite valid refs with undefined
  const newPhotoRef = details.photos?.[0]?.photo_reference;

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
      ...(newPhotoRef ? { photoRef: newPhotoRef } : {}),
      phone: details.formatted_phone_number,
      website: details.website,
      openingHoursJson: details.opening_hours || null,
      rawJson: withFetchedAt(details),
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
      photoRef: newPhotoRef,
      phone: details.formatted_phone_number,
      website: details.website,
      openingHoursJson: details.opening_hours || null,
      rawJson: withFetchedAt(details),
    },
  });

  return cached;
}

// Fetch place details to get photos for places missing them
async function ensurePlaceHasPhotos(place) {
  const hasPhoto = getPhotoRef(place);
  if (hasPhoto) return place;

  try {
    const details = await google.placeDetails(place.placeId);
    if (!details) return place;

    const newPhotoRef = details.photos?.[0]?.photo_reference;
    
    const updated = await prisma.placeCache.update({
      where: { placeId: place.placeId },
      data: {
        ...(newPhotoRef ? { photoRef: newPhotoRef } : {}),
        rawJson: withFetchedAt(details),
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
  
  let place;
  try {
    place = await fetchAndCachePlaceDetails(placeId);
  } catch (err) {
    console.error(err.message);
    return res.status(503).json({ error: "Couldn't load this place right now" });
  }
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
  const isFresh = detailsAreFresh(raw);

  const needsFullDetails = forceRefresh || !place || !hasFullData || !isFresh;

  if (needsFullDetails) {
    console.log(`Fetching full details for ${placeId} (forceRefresh=${forceRefresh}, hasFullData=${hasFullData}, isFresh=${isFresh}, hasPhotos=${hasPhotos}, hasReviews=${hasReviews})`);
    try {
      place = await fetchAndCachePlaceDetails(placeId);
    } catch (err) {
      // Google refused (quota, billing...). Older saved details beat an error page.
      console.error(err.message);
      if (!place) {
        return res.status(503).json({ error: "Couldn't load this café right now" });
      }
    }
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
    try {
      place = await fetchAndCachePlaceDetails(placeId);
    } catch (err) {
      console.error(err.message);
      return res.status(503).json({ error: 'Suggestions are unavailable right now', recommendations: [] });
    }
  }

  if (!place || !place.lat || !place.lng) {
    return res.status(404).json({ error: 'Place not found or missing location' });
  }

  const cacheKey = `recs:${placeId}`;
  const cachedRecs = await prisma.placeSearchCache.findUnique({ where: { queryKey: cacheKey } });
  const cacheAge = cachedRecs ? Date.now() - new Date(cachedRecs.createdAt).getTime() : Infinity;

  let recommendations;
  if (cacheAge < RECS_CACHE_TTL) {
    const ids = cachedRecs.placeIdsJson.slice(0, parseInt(limit));
    const rows = await prisma.placeCache.findMany({ where: { placeId: { in: ids } } });
    recommendations = ids.map((id) => rows.find((r) => r.placeId === id)).filter(Boolean);
  } else {
    let results;
    try {
      results = await google.nearbySearch(place.lat, place.lng, RECS_RADIUS_METERS);
    } catch (err) {
      console.error(err.message);
      return res.status(503).json({ error: 'Suggestions are unavailable right now', recommendations: [] });
    }

    // Filter out the current place and cache results
    recommendations = await Promise.all(
      results
        .filter((r) => r.place_id !== placeId)
        .slice(0, parseInt(limit))
        .map(async (r) => {
          const existing = await prisma.placeCache.findUnique({ 
            where: { placeId: r.place_id } 
          });
          const hasDetailedData = existing?.rawJson?.reviews?.length > 0;
          const newPhotoRef = r.photos?.[0]?.photo_reference;
        
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
          return cached;
        })
    );

    const placeIds = recommendations.map((p) => p.placeId);
    await prisma.placeSearchCache.upsert({
      where: { queryKey: cacheKey },
      update: { placeIdsJson: placeIds, createdAt: new Date() },
      create: {
        queryKey: cacheKey,
        centerLat: place.lat,
        centerLng: place.lng,
        radiusMeters: RECS_RADIUS_METERS,
        keyword: 'matcha',
        placeIdsJson: placeIds,
      },
    });
  }

  // Ensure all recommendations have photos
  recommendations = await Promise.all(recommendations.map(ensurePlaceHasPhotos));

  const formattedRecs = recommendations.map((p) => {
    const photoRef = getPhotoRef(p);
    return {
      placeId: p.placeId,
      name: p.name,
      address: p.address,
      area: getArea(p),
      rating: p.rating,
      userRatingsTotal: p.userRatingsTotal,
      priceLevel: p.priceLevel,
      photoUrl: photoRef ? google.getPhotoUrl(photoRef, 400) : null,
    };
  });

  res.json({ recommendations: formattedRecs });
});

module.exports = router;
