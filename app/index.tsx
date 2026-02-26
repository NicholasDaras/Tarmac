import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@tarmac/onboarding_complete';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(value => {
      setShowOnboarding(!value);
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (showOnboarding) return <Redirect href={"/onboarding" as any} />;
  return <Redirect href="/(tabs)/feed" />;
}
