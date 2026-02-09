# Tarmac Setup Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- iOS Simulator (Mac) or Expo Go app (iPhone)
- Supabase account (free tier)
- Mapbox account (free tier)

## Step 1: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/tarmac.git
cd tarmac
npm install
```

## Step 2: Supabase Setup

1. Go to https://supabase.com and create a new project
2. Copy your Project URL and Anon Key
3. Run the database migrations (see DATABASE.md)

## Step 3: Mapbox Setup

1. Go to https://mapbox.com and create an account
2. Generate a public access token
3. Add to your .env file

## Step 4: Environment Variables

Create `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

## Step 5: Run the App

```bash
# iOS Simulator
npx expo start --ios

# Or scan QR code with Expo Go app
npx expo start
```

## Troubleshooting

### Metro bundler issues
```bash
npx expo start --clear
```

### iOS build fails
```bash
cd ios && pod install && cd ..
```

### Supabase connection errors
- Check your URL and key are correct
- Ensure RLS policies are set up

## Next Steps

See [DATABASE.md](./DATABASE.md) for schema details.
