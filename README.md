# 🍵 Matcha Finder

Discover local matcha cafés and drinks based on distance, rating, and popularity.

## Features

- **Search nearby matcha cafés** using Google Places API
- **Sort results** by distance, rating, popularity, or best match
- **Save favorites** for quick access
- **Create custom tags** to organize places
- **Build shareable lists** with public URLs
- **Geolocation support** to find cafés near you

## Tech Stack

- **Frontend:** Next.js + React
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Docker) + Prisma ORM
- **APIs:** Google Maps Places API

## Quick Start

### 1. Database

Start PostgreSQL with Docker:

```bash
docker compose up -d
```

Default credentials:
- Host: `localhost:5432`
- User: `postgres`
- Password: `postgres`
- Database: `matcha_finder`

### 2. Server

```bash
cd server
cp .env.example .env   # Add your Google API key
npm install
npx prisma db push
npm run dev
```

Server runs on http://localhost:4000

### 3. Client

```bash
cd client
npm install
npm run dev
```

Client runs on http://localhost:3000

## Environment Variables

### Server (`server/.env`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/matcha_finder
GOOGLE_MAPS_API_KEY=your_google_api_key_here
PORT=4000
```

### Client (`client/.env.local`)

```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

## API Endpoints

### Users
- `POST /api/users/login` - Login or create user

### Places
- `GET /api/places/autocomplete?input=...` - Location autocomplete
- `GET /api/places/details/:placeId` - Get place details (caches to DB)
- `GET /api/places/:placeId` - Get cached place

### Search
- `GET /api/search/nearby?lat=...&lng=...&radius=...&sort=...` - Search matcha cafés

### Favorites
- `POST /api/favorites/toggle` - Toggle favorite
- `GET /api/favorites?userId=...` - Get user favorites

### Tags
- `POST /api/tags/create` - Create tag
- `GET /api/tags?userId=...` - Get user tags
- `POST /api/tags/attach` - Attach tag to place
- `POST /api/tags/detach` - Detach tag from place
- `GET /api/tags/for-place?placeId=...&userId=...` - Get tags for place

### Lists
- `POST /api/lists/create` - Create list
- `GET /api/lists?userId=...` - Get user lists
- `POST /api/lists/add-item` - Add place to list
- `POST /api/lists/remove-item` - Remove place from list
- `GET /api/lists/by-share/:shareId` - Get public list

## Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable these APIs:
   - Places API
   - Maps JavaScript API
4. Create an API key under Credentials
5. Add the key to `server/.env`
