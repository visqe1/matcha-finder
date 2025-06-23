require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
