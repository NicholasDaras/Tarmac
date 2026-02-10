import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EngagementBarProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onComment: () => void;
}

/**
 * EngagementBar Component
 * 
 * Like, save, comment, and share buttons for drive detail
 */
export function EngagementBar({
  likesCount,
  commentsCount,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onShare,
  onComment,
}: EngagementBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <TouchableOpacity style={styles.button} onPress={onLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? '#FF0000' : '#000'}
          />
          {likesCount > 0 && (
            <Text style={styles.count}>{likesCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={26} color="#000" />
          {commentsCount > 0 && (
            <Text style={styles.count}>{commentsCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onShare}>
          <Ionicons name="share-outline" size={26} color="#000" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={26}
          color={isSaved ? '#FF0000' : '#000'}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  leftGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
