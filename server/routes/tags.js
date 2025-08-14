const express = require('express');
const prisma = require('../db');

const router = express.Router();

router.post('/create', async (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: 'userId and name required' });
  }

  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name },
  });

  res.json({ tag });
});

router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  res.json({ tags });
});

router.post('/attach', async (req, res) => {
  const { tagId, placeId } = req.body;
  if (!tagId || !placeId) {
    return res.status(400).json({ error: 'tagId and placeId required' });
  }

  await prisma.placeTag.upsert({
    where: { tagId_placeId: { tagId, placeId } },
    update: {},
    create: { tagId, placeId },
  });

  res.json({ ok: true });
});

router.post('/detach', async (req, res) => {
  const { tagId, placeId } = req.body;
  if (!tagId || !placeId) {
    return res.status(400).json({ error: 'tagId and placeId required' });
  }

  await prisma.placeTag.deleteMany({
    where: { tagId, placeId },
  });

  res.json({ ok: true });
});

router.get('/for-place', async (req, res) => {
  const { placeId, userId } = req.query;
  if (!placeId || !userId) {
    return res.status(400).json({ error: 'placeId and userId required' });
  }

  const placeTags = await prisma.placeTag.findMany({
    where: { placeId },
  });

  const tagIds = placeTags.map((pt) => pt.tagId);
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds }, userId },
  });

  res.json({ tags });
});

module.exports = router;

