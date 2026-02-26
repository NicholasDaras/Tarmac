import {
  createContext, useContext, useEffect, useRef, useState,
  useCallback, ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

const NOTIF_PROMPT_KEY = '@tarmac/notifications_prompted';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationData = {
  type: 'like' | 'comment' | 'follow' | 'drive';
  path: string;
  driveId?: string;
  userId?: string;
};

interface NotificationsContextType {
  hasPrompted: boolean;
  registerForPushNotifications: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextType>({
  hasPrompted: false,
  registerForPushNotifications: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hasPrompted, setHasPrompted] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Check if we've already prompted
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PROMPT_KEY).then(v => {
      if (v) setHasPrompted(true);
    });
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Register device and save token to Supabase
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) return; // No-op in simulator

    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
    setHasPrompted(true);

    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return; // User declined

    // Get Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('No EAS projectId found — push token not registered');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token || !user) return;

    // Upsert token into push_tokens table
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }, [user]);

  return (
    <NotificationsContext.Provider value={{ hasPrompted, registerForPushNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
