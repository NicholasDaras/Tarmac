import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';

/**
 * Tab Icons Configuration
 * 
 * Maps route names to icon names from Ionicons.
 */
const tabIcons: Record<string, { active: string; inactive: string }> = {
  feed: { active: 'home', inactive: 'home-outline' },
  search: { active: 'search', inactive: 'search-outline' },
  create: { active: 'add-circle', inactive: 'add-circle-outline' },
  events: { active: 'calendar', inactive: 'calendar-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

/**
 * Main Tab Layout
 * 
 * This is the primary navigation structure of the app.
 * Four tabs: Feed, Create, Events, Profile
 */
export default function TabLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Tab bar icon configuration
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name] || tabIcons.feed;
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        
        // Styling
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 88, // Extra height for iOS home indicator
          paddingBottom: 28,
        },
        
        // Hide headers for tab screens (we'll handle in each screen)
        headerShown: false,
      })}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
