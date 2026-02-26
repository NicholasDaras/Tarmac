import '@/lib/gps-tracker'; // Register background task before React tree
import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../lib/auth-context';
import { SocialProvider } from '../lib/social-context';
import { ModerationProvider } from '../lib/moderation-context';
import { NotificationsProvider } from '../lib/notifications-context';
import { supabase } from '../lib/supabase';

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Parse the fragment (#access_token=...&type=recovery)
      const fragment = url.split('#')[1];
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (type === 'recovery' && accessToken && refreshToken) {
        // Set the session so reset-password screen can call updateUser
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          router.replace('/(auth)/reset-password');
        }
      }
    };

    // App opened from a deep link while closed
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // App already open, deep link received
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    // Handle notification taps (navigate to the relevant screen)
    const notifSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { path?: string } | undefined;
      if (data?.path) {
        router.push(data.path as any);
      }
    });

    return () => {
      subscription.remove();
      notifSub.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationsProvider>
      <AuthProvider>
        <SocialProvider>
          <ModerationProvider>
          <StatusBar style="dark" />
          <DeepLinkHandler />
          <Slot />
          </ModerationProvider>
        </SocialProvider>
      </AuthProvider>
      </NotificationsProvider>
    </SafeAreaProvider>
  );
}
