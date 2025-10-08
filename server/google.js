const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Warn if API key is missing
if (!GOOGLE_API_KEY) {
  console.error('WARNING: GOOGLE_MAPS_API_KEY is not set! Photos and API calls will fail.');
}

async function placeAutocomplete(input) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('types', 'geocode'); // addresses, neighborhoods, cities, etc.
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.predictions || [];
}

async function placeDetails(placeId) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,types,photos,formatted_phone_number,website,opening_hours,reviews,editorial_summary');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.result || null;
}

function getPhotoUrl(photoRef, maxWidth = 800) {
  if (!photoRef) return null;
  if (!GOOGLE_API_KEY) {
    console.error('Cannot generate photo URL: GOOGLE_MAPS_API_KEY is not set');
    return null;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
}

async function nearbySearch(lat, lng, radius) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', radius);
  url.searchParams.set('keyword', 'matcha');
  url.searchParams.set('type', 'cafe');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Search for cafes by text query (e.g., "matcha cafe in NYC" or "Cha Cha Matcha")
async function textSearch(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} matcha`);
  url.searchParams.set('type', 'cafe');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Autocomplete for cafe names (establishments)
async function cafeAutocomplete(input) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', `${input} matcha`);
  url.searchParams.set('types', 'establishment');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.predictions || [];
}

module.exports = {
  placeAutocomplete,
  placeDetails,
  nearbySearch,
  getPhotoUrl,
  textSearch,
  cafeAutocomplete,
};
