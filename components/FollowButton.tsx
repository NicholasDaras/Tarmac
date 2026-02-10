import { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSocial } from '../lib/social-context';

/**
 * Props for FollowButton
 */
interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * Follow Button Component
 * 
 * Displays follow/unfollow button with optimistic UI updates
 */
export function FollowButton({ userId, onFollowChange }: FollowButtonProps) {
  const { isFollowing, followUser, unfollowUser } = useSocial();
  const [following, setFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Load initial follow state
   */
  useEffect(() => {
    const loadState = async () => {
      const state = await isFollowing(userId);
      setFollowing(state);
      setIsLoading(false);
    };

    loadState();
  }, [userId, isFollowing]);

  /**
   * Toggle follow status
   */
  const handlePress = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    const newFollowingState = !following;
    
    // Optimistic update
    setFollowing(newFollowingState);
    onFollowChange?.(newFollowingState);

    // API call
    const { error } = newFollowingState
      ? await followUser(userId)
      : await unfollowUser(userId);

    // Revert on error
    if (error) {
      setFollowing(!newFollowingState);
      onFollowChange?.(!newFollowingState);
      console.error('Error toggling follow:', error);
    }

    setIsUpdating(false);
  }, [following, userId, followUser, unfollowUser, isUpdating, onFollowChange]);

  if (isLoading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color="#666" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[
        styles.button,
        following ? styles.followingButton : styles.followButton,
        isUpdating && styles.updatingButton
      ]}
      onPress={handlePress}
      disabled={isUpdating}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.text,
        following ? styles.followingText : styles.followText
      ]}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: '#000',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadingButton: {
    backgroundColor: '#f0f0f0',
  },
  updatingButton: {
    opacity: 0.7,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: '#333',
  },
});
