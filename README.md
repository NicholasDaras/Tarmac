# Tarmac - Social Road Trip Sharing App

A mobile-first social platform for car enthusiasts to share, discover, and rate scenic drives and road trips.

## Tech Stack

- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Maps:** Apple Maps (react-native-maps, iOS only)
- **Navigation:** Expo Router v6
- **Language:** TypeScript

## Project Structure

```
tarmac/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── (tabs)/            # Main tab navigation
│   │   ├── feed/          # Drive feed
│   │   ├── create.tsx     # Recording controller
│   │   ├── events.tsx     # Events
│   │   ├── search.tsx     # Search
│   │   ├── profile.tsx    # User profile
│   │   └── _layout.tsx
│   ├── drive/             # Drive detail screens
│   ├── profile/           # Profile screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable components
├── lib/                   # Utilities & config
├── docs/                  # Documentation
└── assets/                # Images, fonts
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

3. **Start the app (Expo Go):**
   ```bash
   npm run ios
   ```

4. **Start the app (Development Build — required for GPS tracking):**
   ```bash
   npx expo run:ios
   ```

## Documentation

- [Database Schema](./docs/DATABASE.md)
- [Security Audit](./docs/SECURITY_AUDIT_REPORT.md)

---

## Planned Feature: GPS Route Tracking

> **Status:** Ready to build. Implementation planned.

### Overview

When a user opens the Create tab, they tap **Start Drive**. Tarmac records their GPS route in the background (phone can be locked) as they drive. When they arrive home they tap **Finish Drive**, which stops recording and takes them to a review/publish screen where they fill in the title, description, photos, tags, and rating before publishing.

### User Flow

```
Create Tab
    │
    ├── [No draft]     → "Start Drive" button
    ├── [Recording]    → Timer + GPS point count + "Finish Drive" button
    └── [Draft saved]  → "Review & Publish" + "Discard Draft" buttons
            │
            └── Review Screen
                    ├── Map preview of recorded route
                    ├── Photo upload
                    ├── Title, description
                    ├── Star rating
                    ├── Tags
                    ├── Points of Interest
                    └── "Publish Drive" → Feed
```

### GPS Sampling Strategy (conservative)

- Minimum **50 metres** between recorded points
- Maximum **60 second** gap (fallback for slow/stopped moments)
- OS pre-filter set to 20m, with business-rule filter applied in the background task handler
- Accuracy: `Balanced` (GPS + WiFi/Cell) with `activityType: AutomotiveNavigation`
- Tunnel mode: gaps fill naturally as connected dots — no special handling needed
- Estimated data usage: ~6 KB/hour

### Draft Saving

- GPS points saved to AsyncStorage continuously during recording
- If the app is force-killed mid-drive, the draft is preserved and recovered on next app open
- Draft is cleared only after a successful publish

### Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `lib/gps-tracker.ts` | **Create** | Background task definition, start/stop API, haversine filter, draft persistence |
| `app/drive/review.tsx` | **Create** | Review & publish form with GPS route pre-loaded |
| `app/(tabs)/create.tsx` | **Replace** | Three-state recording controller (idle / recording / draft) |
| `app/_layout.tsx` | **Modify** | Import `gps-tracker` as first line to register task at bundle init |
| `app.json` | **Modify** | Add `UIBackgroundModes: ["location"]`, background location plugin, updated permission strings |
| `lib/supabase.ts` | **Modify** | Add `RouteCoordinate` and `RouteData` types; update `Drive.route_data` type |

### New Package Required

```bash
npx expo install expo-task-manager
```

### app.json Changes Required

```json
{
  "ios": {
    "infoPlist": {
      "NSLocationAlwaysAndWhenInUseUsageDescription": "Tarmac records your GPS route while you drive, even when the screen is locked.",
      "NSLocationAlwaysUsageDescription": "Tarmac records your GPS route while you drive, even when the screen is locked.",
      "UIBackgroundModes": ["location"]
    }
  },
  "plugins": [
    "expo-router",
    "expo-secure-store",
    ["expo-location", {
      "locationAlwaysAndWhenInUsePermission": "Tarmac records your GPS route while you drive, even when the screen is locked.",
      "isIosBackgroundLocationEnabled": true
    }]
  ]
}
```

### Critical Implementation Notes

1. **Expo Go will not work for this feature.** Background location requires `UIBackgroundModes: location` baked into the native binary. Use `npx expo run:ios` to build a development build.

2. **Task definition must be at module scope.** `TaskManager.defineTask(...)` must be called at the top level of `lib/gps-tracker.ts`, and that file must be imported from `app/_layout.tsx` as the very first import — before any React component code. If defined inside a component or `useEffect`, iOS silently drops background events.

3. **Two separate permission prompts on iOS.** `requestForegroundPermissionsAsync()` and `requestBackgroundPermissionsAsync()` are separate calls that trigger separate system dialogs. The user must grant "Always Allow" (not just "While Using") for background recording to work.

4. **`pausesUpdatesAutomatically: false` is essential.** The iOS default (`true`) lets the OS silently pause updates when it decides location is "unlikely to change." Always override this to `false` for a driving context.

5. **Development build workflow:**
   - Make code changes in the IDE as normal (hot reload still works)
   - Only need to rebuild (`npx expo run:ios`) when `app.json` or native config changes
   - After the first build, code changes hot-reload to the phone instantly

### route_data Column Schema (extended)

The existing `route_data jsonb` column on the `drives` table is extended to store GPS coordinates. Backward compatible — old records with `{ description: string }` still work.

```typescript
type RouteData = {
  description?: string;
  coordinates?: { lat: number; lng: number; t: number }[];
  distance_meters?: number;
  duration_seconds?: number | null;
} | null;
```

---

## Future Developments

> Ideas to revisit in future sprints.

### Live Map While Recording
Show a live map on the Create tab while recording, drawing the route polyline in real time as GPS points come in. Currently the screen is intentionally minimal (just a timer) to reduce battery usage.

### Events & Meetups
Full implementation of the Events tab — car meetups, Cars & Coffee, group drives. Users can RSVP, see who's going, and get directions. Database tables (`events`, `event_rsvps`) are already in the schema.

### Drive Discovery Map
A full-screen map on the Search/Explore tab showing all shared drives as route overlays, letting users browse drives geographically rather than by list.

### Segment / Leaderboard
Compare lap times or segment times on popular roads — like a Strava segment system but for cars.

### Push Notifications
Notify users when someone likes or comments on their drive, or when someone they follow posts a new drive.

### Garage / My Cars
Let users add their cars (make, model, year, photo) to their profile and tag which car they used on a drive. The `cars` table is already in the schema.

---

## License

MIT
