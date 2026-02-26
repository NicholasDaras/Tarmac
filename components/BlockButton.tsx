import { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useModeration } from '@/lib/moderation-context';
import * as Haptics from 'expo-haptics';

interface BlockButtonProps {
  userId: string;
  username: string;
  onBlockChange?: (isBlocked: boolean) => void;
}

export function BlockButton({ userId, username, onBlockChange }: BlockButtonProps) {
  const { isBlocked, blockUser, unblockUser } = useModeration();
  const [blocked, setBlocked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setBlocked(isBlocked(userId));
  }, [userId, isBlocked]);

  const handlePress = useCallback(async () => {
    if (isUpdating) return;

    if (!blocked) {
      // Confirm before blocking
      Alert.alert(
        `Block @${username}?`,
        'They will not be notified. Their content will be hidden from your feed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              setIsUpdating(true);
              setBlocked(true);
              onBlockChange?.(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const { error } = await blockUser(userId, username);
              if (error) {
                setBlocked(false);
                onBlockChange?.(false);
              }
              setIsUpdating(false);
            },
          },
        ]
      );
    } else {
      setIsUpdating(true);
      setBlocked(false);
      onBlockChange?.(false);
      const { error } = await unblockUser(userId);
      if (error) {
        setBlocked(true);
        onBlockChange?.(true);
      }
      setIsUpdating(false);
    }
  }, [blocked, userId, username, blockUser, unblockUser, isUpdating, onBlockChange]);

  return (
    <TouchableOpacity
      style={[styles.button, blocked ? styles.blockedButton : styles.blockButton, isUpdating && styles.updating]}
      onPress={handlePress}
      disabled={isUpdating}
      activeOpacity={0.7}
    >
      {isUpdating
        ? <ActivityIndicator size="small" color={blocked ? '#666' : '#fff'} />
        : <Text style={[styles.text, blocked ? styles.blockedText : styles.blockText]}>
            {blocked ? 'Unblock' : 'Block'}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 6, minWidth: 72, alignItems: 'center', justifyContent: 'center',
  },
  blockButton: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  blockedButton: { backgroundColor: '#FFE5E5', borderWidth: 1, borderColor: '#FFB3B3' },
  updating: { opacity: 0.6 },
  text: { fontSize: 14, fontWeight: '600' },
  blockText: { color: '#333' },
  blockedText: { color: '#CC0000' },
});
