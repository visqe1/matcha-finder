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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
