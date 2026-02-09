import { Stack } from 'expo-router';

/**
 * Auth Group Layout
 * 
 * This layout wraps all authentication screens (login, signup).
 * It uses a Stack navigator for simple screen-to-screen transitions.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide header for clean auth screens
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
