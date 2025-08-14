require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const usersRoutes = require('./routes/users');
const placesRoutes = require('./routes/places');
const searchRoutes = require('./routes/search');
const favoritesRoutes = require('./routes/favorites');
const tagsRoutes = require('./routes/tags');
const listsRoutes = require('./routes/lists');

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

app.use('/api/users', usersRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/lists', listsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
