import { Redirect } from 'expo-router';

/**
 * Entry Point
 * 
 * Redirects to the feed (main app) or auth flow.
 * The AuthProvider in the root layout will handle the actual routing logic.
 */
export default function Index() {
  // Redirect to feed - AuthProvider will handle auth check
  return <Redirect href="/(tabs)/feed" />;
}
