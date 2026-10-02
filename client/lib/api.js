const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

// Photo URLs come back as paths on our server (e.g. /api/photo?ref=...),
// which keeps the Google API key off the client. Point them at the server.
export function photoSrc(url) {
  if (!url) return url;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function register(username, password) {
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
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

export async function searchCafes(query) {
  const res = await fetch(`${API_URL}/api/search/cafes?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function toggleFavorite(userId, placeId) {
  const res = await fetch(`${API_URL}/api/favorites/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, placeId }),
  });
  return res.json();
}

export async function getFavorites(userId) {
  const res = await fetch(`${API_URL}/api/favorites?userId=${userId}`);
  return res.json();
}

export async function getPlace(placeId) {
  const res = await fetch(`${API_URL}/api/places/${placeId}`);
  return res.json();
}

export async function checkFavorite(userId, placeId) {
  const res = await fetch(`${API_URL}/api/favorites/check?userId=${userId}&placeId=${placeId}`);
  return res.json();
}

export async function createList(userId, title) {
  const res = await fetch(`${API_URL}/api/lists/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title }),
  });
  return res.json();
}

export async function renameList(listId, userId, title) {
  const res = await fetch(`${API_URL}/api/lists/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId, userId, title }),
  });
  return res.json();
}

export async function getLists(userId) {
  const res = await fetch(`${API_URL}/api/lists?userId=${userId}`);
  return res.json();
}

export async function addToList(listId, userId, placeId) {
  const res = await fetch(`${API_URL}/api/lists/add-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId, userId, placeId }),
  });
  return res.json();
}

export async function removeFromList(listId, userId, placeId) {
  const res = await fetch(`${API_URL}/api/lists/remove-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId, userId, placeId }),
  });
  return res.json();
}

export async function deleteList(listId, userId) {
  const res = await fetch(`${API_URL}/api/lists/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId, userId }),
  });
  return res.json();
}

export async function getListByShareId(shareId) {
  const res = await fetch(`${API_URL}/api/lists/by-share/${shareId}`);
  return res.json();
}

export async function getRecommendations(placeId, limit = 6) {
  const res = await fetch(`${API_URL}/api/places/${placeId}/recommendations?limit=${limit}`);
  return res.json();
}
