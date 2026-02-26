# Tarmac — Social Road Trip Sharing

A mobile-first social platform for car enthusiasts to share, discover, and rate scenic drives.

## Tech Stack

- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Maps:** Apple Maps (react-native-maps, iOS only)
- **Navigation:** Expo Router v6
- **Language:** TypeScript

## Project Structure

```
tarmac/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login, signup, password reset
│   ├── (tabs)/             # Feed, Events, Create, Search, Profile
│   ├── drive/              # Drive detail + review/publish
│   └── profile/            # Other user profiles, edit profile
├── components/             # 19 reusable UI components
├── lib/                    # Auth, social, GPS, validation, Supabase client
├── docs/                   # Documentation
└── assets/                 # App icon, splash screen
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

3. **Start the app (Expo Go — no GPS):**
   ```bash
   npm run ios
   ```

4. **Start the app (Development Build — required for GPS tracking):**
   ```bash
   npx expo run:ios
   ```

## Documentation

| Document | Description |
|----------|-------------|
| [Assessment & Roadmap](./docs/TARMAC_ASSESSMENT_AND_ROADMAP.md) | Production readiness audit, development roadmap, feature backlog |
| [Database Schema](./docs/DATABASE.md) | Tables, RLS policies, indexes |
| [Security Audit](./docs/SECURITY_AUDIT_REPORT.md) | OWASP compliance, hardening details |
| [Setup Guide](./docs/SETUP.md) | Development environment setup |

## Key Features

- **GPS Background Tracking** — Record your driving route with the phone locked
- **Drive Publishing** — Share routes with photos, ratings, tags, and points of interest
- **Social Feed** — Browse, like, save, and comment on drives
- **Search & Filter** — Find drives by keyword, tags, or minimum rating
- **User Profiles** — Follow other drivers, view their drive history
- **Apple Maps** — Native map rendering with route polylines

## License

MIT
