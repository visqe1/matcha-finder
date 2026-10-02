const express = require('express');
const google = require('../google');

const router = express.Router();

const ALLOWED_WIDTHS = [400, 800];
// Google photo references are long URL-safe tokens
const PHOTO_REF_PATTERN = /^[A-Za-z0-9_-]{10,2000}$/;

// Streams a Google place photo through our server so the API key never reaches the browser.
// Nothing is stored; the browser may keep it for an hour like any image.
router.get('/', async (req, res) => {
  const { ref } = req.query;
  const width = ALLOWED_WIDTHS.includes(Number(req.query.w)) ? Number(req.query.w) : 400;

  if (typeof ref !== 'string' || !PHOTO_REF_PATTERN.test(ref)) {
    return res.status(400).json({ error: 'Invalid photo reference' });
  }

  try {
    const upstream = await google.fetchPhoto(ref, width);
    if (!upstream.ok) {
      console.error(`Google photo request failed: ${upstream.status}`);
      return res.status(502).json({ error: 'Photo unavailable' });
    }

    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('Photo proxy error:', err.message);
    res.status(502).json({ error: 'Photo unavailable' });
  }
});

module.exports = router;
