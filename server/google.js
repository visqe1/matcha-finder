const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Warn if API key is missing
if (!GOOGLE_API_KEY) {
  console.error('WARNING: GOOGLE_MAPS_API_KEY is not set! Photos and API calls will fail.');
}

// Google answers HTTP 200 even when it refuses a request (daily quota, billing,
// bad key), so check the status rather than passing an empty list along as
// "no results".
class GoogleUnavailableError extends Error {}

function resultsOrThrow(data) {
  if (data.status === 'OK' || data.status === 'ZERO_RESULTS') return data.results || [];
  const detail = data.error_message ? `: ${data.error_message}` : '';
  throw new GoogleUnavailableError(`Google Places ${data.status}${detail}`);
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
  url.searchParams.set('fields', 'place_id,name,formatted_address,address_components,geometry,rating,user_ratings_total,price_level,types,photos,formatted_phone_number,website,opening_hours,reviews,editorial_summary');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK') return data.result || null;
  // The place really doesn't exist (or the ID is malformed)
  if (data.status === 'NOT_FOUND' || data.status === 'ZERO_RESULTS' || data.status === 'INVALID_REQUEST') {
    return null;
  }
  const detail = data.error_message ? `: ${data.error_message}` : '';
  throw new GoogleUnavailableError(`Google Places ${data.status}${detail}`);
}

// Returns a path on our own server (see routes/photos.js), never a Google URL,
// so the API key stays server-side. The client prefixes it with the server URL.
function getPhotoUrl(photoRef, maxWidth = 800) {
  if (!photoRef) return null;
  return `/api/photo?ref=${encodeURIComponent(photoRef)}&w=${maxWidth}`;
}

async function fetchPhoto(photoRef, maxWidth) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
  url.searchParams.set('maxwidth', maxWidth);
  url.searchParams.set('photo_reference', photoRef);
  url.searchParams.set('key', GOOGLE_API_KEY);

  return fetch(url);
}

async function nearbySearch(lat, lng, radius) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', radius);
  url.searchParams.set('keyword', 'matcha');
  url.searchParams.set('type', 'cafe');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  return resultsOrThrow(await res.json());
}

// Search for cafes by text query (e.g., "matcha cafe in NYC" or "Cha Cha Matcha")
async function textSearch(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} matcha`);
  url.searchParams.set('type', 'cafe');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  return resultsOrThrow(await res.json());
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
  GoogleUnavailableError,
  placeAutocomplete,
  placeDetails,
  nearbySearch,
  getPhotoUrl,
  fetchPhoto,
  textSearch,
  cafeAutocomplete,
};
