const express = require('express');
const prisma = require('../db');
const google = require('../google');

const router = express.Router();

function generateShareId() {
  return Math.random().toString(36).substring(2, 10);
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
  const { listId, placeId } = req.body;
  if (!listId || !placeId) {
    return res.status(400).json({ error: 'listId and placeId required' });
  }

  await prisma.cafeListItem.upsert({
    where: { listId_placeId: { listId, placeId } },
    update: {},
    create: { listId, placeId },
  });

  res.json({ ok: true });
});

router.post('/remove-item', async (req, res) => {
  const { listId, placeId } = req.body;
  if (!listId || !placeId) {
    return res.status(400).json({ error: 'listId and placeId required' });
  }

  await prisma.cafeListItem.deleteMany({
    where: { listId, placeId },
  });

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
  const cachedPlaces = await prisma.placeCache.findMany({
    where: { placeId: { in: placeIds } },
  });

  // Format places for PlaceCard component
  const places = cachedPlaces.map((p) => ({
    placeId: p.placeId,
    name: p.name,
    address: p.address,
    rating: p.rating,
    userRatingsTotal: p.userRatingsTotal,
    priceLevel: p.priceLevel,
    photoUrl: p.photoRef ? google.getPhotoUrl(p.photoRef, 400) : null,
  }));

  res.json({
    list: {
      ...list,
      places,
    },
  });
});

module.exports = router;

