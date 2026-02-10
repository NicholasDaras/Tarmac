import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDriveInteractions } from '../lib/use-drive-interactions';

/**
 * Props for SocialActionBar
 */
interface SocialActionBarProps {
  driveId: string;
  likesCount: number;
  commentsCount: number;
  onCommentPress?: () => void;
}

/**
 * Social Action Bar Component
 * 
 * Displays like, comment, and save buttons for a drive
 * Handles optimistic UI updates and animations
 */
export function SocialActionBar({ 
  driveId, 
  likesCount, 
  commentsCount,
  onCommentPress 
}: SocialActionBarProps) {
  const { isLiked, isSaved, likeScale, toggleLike, toggleSave } = useDriveInteractions(driveId);

  return (
    <View style={styles.container}>
      <View style={styles.leftActions}>
        {/* Like Button */}
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={toggleLike}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons 
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={isLiked ? '#FF0000' : '#333'} 
            />
          </Animated.View>
          <Text style={[styles.countText, isLiked && styles.activeCountText]}>
            {likesCount + (isLiked ? 1 : 0)}
          </Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onCommentPress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#333" />
          <Text style={styles.countText}>{commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={toggleSave}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isSaved ? 'bookmark' : 'bookmark-outline'} 
          size={24} 
          color={isSaved ? '#000' : '#333'} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeCountText: {
    color: '#FF0000',
  },
});
