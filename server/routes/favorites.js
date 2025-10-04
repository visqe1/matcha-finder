const express = require('express');
const prisma = require('../db');

const router = express.Router();

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
  const places = await prisma.placeCache.findMany({
    where: { placeId: { in: placeIds } },
  });

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

