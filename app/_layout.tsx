import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth-context';

/**
 * Root Layout
 * 
 * This wraps the entire app with:
 * - SafeAreaProvider: Handles notches and safe areas
 * - AuthProvider: Manages authentication state globally
 * - StatusBar: Controls the status bar appearance
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
