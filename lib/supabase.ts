import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore Adapter for Supabase
 * 
 * This allows Supabase to securely store the session tokens
 * using Expo's SecureStore (encrypted keychain on iOS).
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

/**
 * Supabase Client Configuration
 * 
 * These values come from environment variables.
 * Make sure to set them in your .env file.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Validate configuration
 */
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please check your .env file:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Create Supabase Client
 * 
 * This is the main client used throughout the app for:
 * - Authentication
 * - Database queries
 * - Storage operations
 * - Realtime subscriptions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

/**
 * Type definitions for database tables
 * 
 * These help TypeScript understand your database schema.
 */
export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Car = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number | null;
  photo_url: string | null;
  created_at: string;
};

export type Drive = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  rating: number | null;
  route_data: object | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type DrivePhoto = {
  id: string;
  drive_id: string;
  photo_url: string;
  order_index: number;
  created_at: string;
};

export type DriveStop = {
  id: string;
  drive_id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  order_index: number;
  created_at: string;
};

export type Event = {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  date_time: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  car_requirements: string | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRSVP = {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'interested' | 'cant_go';
  created_at: string;
};
