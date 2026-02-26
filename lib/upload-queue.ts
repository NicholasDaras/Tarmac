import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const QUEUE_KEY = '@tarmac/pending_uploads';
const PHOTOS_DIR = `${FileSystem.documentDirectory}pending_uploads/`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingUpload {
  id: string;
  title: string;
  description: string;
  rating: number;
  tags: string[];
  stops: Array<{ name: string; description?: string }>;
  routePoints: Array<{ latitude: number; longitude: number; timestamp: number }>;
  /** URIs copied to documentDirectory — persist across app restarts */
  stablePhotoPaths: string[];
  createdAt: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function ensurePhotosDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Copy ephemeral picker URIs (in /tmp) to stable documentDirectory.
 * This ensures photos survive an app kill before upload completes.
 */
async function stashPhotos(photoPaths: string[], uploadId: string): Promise<string[]> {
  await ensurePhotosDir();
  const stable: string[] = [];
  for (let i = 0; i < photoPaths.length; i++) {
    const dest = `${PHOTOS_DIR}${uploadId}_${i}.jpg`;
    try {
      await FileSystem.copyAsync({ from: photoPaths[i], to: dest });
      stable.push(dest);
    } catch {
      // If copy fails (e.g. URI already gone), skip this photo gracefully
    }
  }
  return stable;
}

async function deleteStashedPhotos(paths: string[]): Promise<void> {
  for (const p of paths) {
    await FileSystem.deleteAsync(p, { idempotent: true });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Save a failed publish attempt to the retry queue */
export async function savePendingUpload(
  data: Omit<PendingUpload, 'id' | 'stablePhotoPaths' | 'createdAt'>,
  photoPaths: string[]
): Promise<void> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stablePhotoPaths = await stashPhotos(photoPaths, id);
  const entry: PendingUpload = { ...data, id, stablePhotoPaths, createdAt: Date.now() };
  const existing = await loadPendingUploads();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, entry]));
}

/** Load all pending uploads */
export async function loadPendingUploads(): Promise<PendingUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingUpload[]) : [];
  } catch {
    return [];
  }
}

/** Remove a single upload from the queue and clean up its stashed photos */
export async function removePendingUpload(id: string): Promise<void> {
  const uploads = await loadPendingUploads();
  const toRemove = uploads.find(u => u.id === id);
  if (toRemove) {
    await deleteStashedPhotos(toRemove.stablePhotoPaths);
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(uploads.filter(u => u.id !== id)));
}

/** Clear entire queue and all stashed photos */
export async function clearPendingUploads(): Promise<void> {
  const uploads = await loadPendingUploads();
  for (const u of uploads) {
    await deleteStashedPhotos(u.stablePhotoPaths);
  }
  await AsyncStorage.removeItem(QUEUE_KEY);
}
