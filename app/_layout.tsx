import '@/lib/gps-tracker'; // Register background task before React tree
import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { AuthProvider } from '../lib/auth-context';
import { SocialProvider } from '../lib/social-context';
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
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocialProvider>
          <StatusBar style="dark" />
          <DeepLinkHandler />
          <Slot />
        </SocialProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
