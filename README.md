# Matcha Finder

Discover local matcha cafes and drinks based on distance, rating, and popularity.

## Demo
Quick preview (GIF):
![Matcha Finder demo](assets/demo.gif)

## Features

- **Discover matcha cafes** - Auto-loads nearby spots using your location
- **Search by location** - Cities, neighborhoods, or addresses
- **Sort & filter** - By distance, rating, popularity, or best match
- **Save favorites** - Quick access to places you love
- **Create shareable lists** - Organize and share collections with friends
- **Place details** - Photos, hours, ratings, contact info, and more

## Tech Stack

- **Frontend:** Next.js + React
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Docker) + Prisma ORM
- **APIs:** Google Maps Places API

## Local Setup

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

## Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable these APIs:
   - Places API
   - Maps JavaScript API
4. Create an API key under Credentials
5. Add the key to `server/.env`
