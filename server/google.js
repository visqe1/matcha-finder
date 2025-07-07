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

module.exports = {
  placeAutocomplete,
};

