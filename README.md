# Tarmac - Social Road Trip Sharing App

A mobile-first social platform for car enthusiasts to share, discover, and rate scenic drives and road trips.

## Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Supabase
- **Maps:** Mapbox
- **Navigation:** Expo Router

## Project Structure

```
tarmac/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication group
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/            # Main tab navigation
│   │   ├── feed/          # Drive feed
│   │   ├── create/        # Create drive
│   │   ├── events/        # Events
│   │   ├── profile/       # User profile
│   │   └── _layout.tsx
│   ├── drive/             # Drive detail screens
│   ├── event/             # Event detail screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable components
├── lib/                   # Utilities & config
├── types/                 # TypeScript types
├── supabase/             # Database migrations
├── docs/                 # Documentation
└── assets/               # Images, fonts
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase and Mapbox credentials
   ```

3. **Start the app:**
   ```bash
   npx expo start
   ```

## Documentation

- [Setup Guide](./docs/SETUP.md)
- [Database Schema](./docs/DATABASE.md)
- [API Reference](./docs/API.md)

## License

MIT
