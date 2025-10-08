const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

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
    photoUrl: photoRef ? google.getPhotoUrl(photoRef, 400) : null,
  };
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

router.post('/toggle', async (req, res) => {
  const { userId, placeId } = req.body;
  if (!userId || !placeId) {
    return res.status(400).json({ error: 'userId and placeId required' });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return res.json({ isFavorited: false });
  }

  await prisma.favorite.create({ data: { userId, placeId } });
  res.json({ isFavorited: true });
});

router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const placeIds = favorites.map((f) => f.placeId);
  let cachedPlaces = await prisma.placeCache.findMany({
    where: { placeId: { in: placeIds } },
  });

  // Ensure all places have photos
  cachedPlaces = await Promise.all(cachedPlaces.map(ensurePlaceHasPhotos));

  const places = cachedPlaces.map(formatPlace);
  res.json({ places });
});

router.get('/check', async (req, res) => {
  const { userId, placeId } = req.query;
  if (!userId || !placeId) {
    return res.status(400).json({ error: 'userId and placeId required' });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });

  res.json({ isFavorited: !!existing });
});

module.exports = router;
