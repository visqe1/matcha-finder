const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

function generateShareId() {
  return Math.random().toString(36).substring(2, 10);
}

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

router.post('/create', async (req, res) => {
  const { userId, title } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title required' });
  }

  const list = await prisma.cafeList.create({
    data: {
      userId,
      title,
      shareId: generateShareId(),
    },
  });

  res.json({ list });
});

router.post('/rename', async (req, res) => {
  const { listId, userId } = req.body;
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!listId || !userId || !title) {
    return res.status(400).json({ error: 'listId, userId and title required' });
  }
  if (title.length > 80) {
    return res.status(400).json({ error: 'List names can be up to 80 characters' });
  }

  const list = await prisma.cafeList.findUnique({ where: { id: listId } });
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }
  if (list.userId !== userId) {
    return res.status(403).json({ error: 'You can only rename your own lists' });
  }

  const updated = await prisma.cafeList.update({
    where: { id: listId },
    data: { title },
  });

  res.json({ list: updated });
});

router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const lists = await prisma.cafeList.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Get item counts for each list
  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const itemCount = await prisma.cafeListItem.count({
        where: { listId: list.id },
      });
      return { ...list, itemCount };
    })
  );

  res.json({ lists: listsWithCounts });
});

router.post('/add-item', async (req, res) => {
  const { listId, userId, placeId } = req.body;
  if (!listId || !userId || !placeId) {
    return res.status(400).json({ error: 'listId, userId and placeId required' });
  }
  if (!(await findOwnedList(listId, userId, res))) return;

  await prisma.cafeListItem.upsert({
    where: { listId_placeId: { listId, placeId } },
    update: {},
    create: { listId, placeId },
  });

  res.json({ ok: true });
});

// Returns the list if userId owns it, otherwise sends the error response and returns null
async function findOwnedList(listId, userId, res) {
  const list = await prisma.cafeList.findUnique({ where: { id: listId } });
  if (!list) {
    res.status(404).json({ error: 'List not found' });
    return null;
  }
  if (list.userId !== userId) {
    res.status(403).json({ error: 'You can only change your own lists' });
    return null;
  }
  return list;
}

router.post('/remove-item', async (req, res) => {
  const { listId, userId, placeId } = req.body;
  if (!listId || !userId || !placeId) {
    return res.status(400).json({ error: 'listId, userId and placeId required' });
  }
  if (!(await findOwnedList(listId, userId, res))) return;

  await prisma.cafeListItem.deleteMany({
    where: { listId, placeId },
  });

  res.json({ ok: true });
});

router.post('/delete', async (req, res) => {
  const { listId, userId } = req.body;
  if (!listId || !userId) {
    return res.status(400).json({ error: 'listId and userId required' });
  }
  if (!(await findOwnedList(listId, userId, res))) return;

  // No cascade in the schema, so remove the list's cafés first
  await prisma.$transaction([
    prisma.cafeListItem.deleteMany({ where: { listId } }),
    prisma.cafeList.delete({ where: { id: listId } }),
  ]);

  res.json({ ok: true });
});

router.get('/by-share/:shareId', async (req, res) => {
  const { shareId } = req.params;

  const list = await prisma.cafeList.findUnique({ where: { shareId } });
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }

  const listItems = await prisma.cafeListItem.findMany({
    where: { listId: list.id },
    orderBy: { createdAt: 'asc' },
  });

  const placeIds = listItems.map((item) => item.placeId);
  let cachedPlaces = await prisma.placeCache.findMany({
    where: { placeId: { in: placeIds } },
  });

  // Ensure all places have photos
  cachedPlaces = await Promise.all(cachedPlaces.map(ensurePlaceHasPhotos));

  const places = cachedPlaces.map(formatPlace);

  res.json({
    list: {
      ...list,
      places,
    },
  });
});

module.exports = router;
