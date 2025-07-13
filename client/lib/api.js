const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function login(username) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json();
}

export async function autocomplete(input) {
  const res = await fetch(`${API_URL}/api/places/autocomplete?input=${encodeURIComponent(input)}`);
  return res.json();
}

export async function getPlaceDetails(placeId) {
  const res = await fetch(`${API_URL}/api/places/details/${placeId}`);
  return res.json();
}

export async function searchNearby(lat, lng, radius, sort) {
  const params = new URLSearchParams({ lat, lng, radius, sort });
  const res = await fetch(`${API_URL}/api/search/nearby?${params}`);
  return res.json();
}
