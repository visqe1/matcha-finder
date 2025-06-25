const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function login(username) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json();
}

