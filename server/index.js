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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
