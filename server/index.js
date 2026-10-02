require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const usersRoutes = require('./routes/users');
const placesRoutes = require('./routes/places');
const searchRoutes = require('./routes/search');
const favoritesRoutes = require('./routes/favorites');
const listsRoutes = require('./routes/lists');
const photosRoutes = require('./routes/photos');

const app = express();
const PORT = process.env.PORT || 4000;

// Only these sites may call the API from a browser. Set CORS_ORIGIN in
// production (comma-separated), e.g. https://matchatime.app
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
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
app.use('/api/lists', listsRoutes);
app.use('/api/photo', photosRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
