import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────

export const BACKGROUND_LOCATION_TASK = 'TARMAC_BACKGROUND_LOCATION';
const DRAFT_STORAGE_KEY = '@tarmac/route_draft';
const MIN_DISTANCE_METERS = 50;
const MAX_GAP_MS = 60 * 1000; // 60 seconds

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number; // ms since epoch
}

export interface RouteDraft {
  startedAt: number; // ms since epoch
  points: RoutePoint[];
}

// ─── Haversine distance (metres) ─────────────────────────────────────────────

function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── Draft persistence ────────────────────────────────────────────────────────

export async function loadDraft(): Promise<RouteDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RouteDraft) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: RouteDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
}

// ─── Background Task ─────────────────────────────────────────────────────────
// MUST be defined at module scope — not inside a component or useEffect.
// This file is imported from app/_layout.tsx so it runs before any React tree.

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[GPSTracker] background task error:', error);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const draft = await loadDraft();
  if (!draft) return; // Recording was stopped — ignore stale events

  const newPoints: RoutePoint[] = [];

  for (const loc of locations) {
    const candidate: RoutePoint = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
    };

    const last = draft.points.length > 0
      ? draft.points[draft.points.length - 1]
      : newPoints.length > 0
      ? newPoints[newPoints.length - 1]
      : null;

    if (!last) {
      newPoints.push(candidate);
      continue;
    }

    const dist = haversineMeters(last, candidate);
    const gap = candidate.timestamp - last.timestamp;

    // Accept if moved ≥50m OR gap ≥60s (tunnel mode: gaps connect naturally)
    if (dist >= MIN_DISTANCE_METERS || gap >= MAX_GAP_MS) {
      newPoints.push(candidate);
    }
  }

  if (newPoints.length === 0) return;

  await saveDraft({
    ...draft,
    points: [...draft.points, ...newPoints],
  });
});

// ─── Public API ───────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

export async function startTracking(): Promise<void> {
  // Write initial draft before starting — task handler checks for this
  await saveDraft({ startedAt: Date.now(), points: [] });

  const isRunning = await isCurrentlyTracking();
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 20,           // OS pre-filter (coarse); task applies the 50m rule
    deferredUpdatesInterval: 30000, // Batch delivery every 30s minimum
    showsBackgroundLocationIndicator: true,
    activityType: Location.LocationActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
  });
}

export async function stopTracking(): Promise<RouteDraft | null> {
  const isRunning = await isCurrentlyTracking();
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  return loadDraft();
}

export async function isCurrentlyTracking(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export function computeTotalDistanceMeters(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return Math.round(total);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
