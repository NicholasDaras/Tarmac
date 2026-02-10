import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ProfileScreen from '../(tabs)/profile';

/**
 * User Profile Screen
 * 
 * Wrapper that reuses the profile tab screen but for viewing other users.
 * The profile screen checks the userId param to determine if it's viewing
 * another user's profile or the current user's profile.
 */
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <ProfileScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
