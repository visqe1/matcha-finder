const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function placeAutocomplete(input) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('types', 'establishment');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.predictions || [];
}

async function placeDetails(placeId) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,types,photos,formatted_phone_number,website,opening_hours');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return data.result || null;
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

module.exports = {
  placeAutocomplete,
  placeDetails,
  nearbySearch,
};
