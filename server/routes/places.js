const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

async function fetchAndCachePlaceDetails(placeId) {
  const details = await google.placeDetails(placeId);
  if (!details) return null;

  return prisma.placeCache.upsert({
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

  res.json({ place });
});

router.get('/:placeId', async (req, res) => {
  const { placeId } = req.params;

  let place = await prisma.placeCache.findUnique({ where: { placeId } });

  if (!place) {
    place = await fetchAndCachePlaceDetails(placeId);
  }

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  res.json({ place });
});

module.exports = router;

