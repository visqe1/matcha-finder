const express = require('express');
const prisma = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
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

module.exports = router;

