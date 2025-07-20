require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const google = require('./google');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/db-test', async (req, res) => {
  const userCount = await prisma.user.count();
  res.json({ ok: true, userCount });
});

app.post('/api/users/login', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }
  
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    user = await prisma.user.create({ data: { username } });
  }
  
  res.json({ user: { id: user.id, username: user.username } });
});

app.get('/api/places/autocomplete', async (req, res) => {
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

app.get('/api/places/details/:placeId', async (req, res) => {
  const { placeId } = req.params;
  
  const details = await google.placeDetails(placeId);
  if (!details) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const place = await prisma.placeCache.upsert({
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

  res.json({ place });
});

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

app.get('/api/search/nearby', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
