import { useState, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { useSocial } from './social-context';
import * as Haptics from 'expo-haptics';

/**
 * Hook for managing drive social interactions
 * Handles likes and saves with optimistic UI updates
 */
export function useDriveInteractions(driveId: string) {
  const { likeDrive, unlikeDrive, isDriveLiked, saveDrive, unsaveDrive, isDriveSaved } = useSocial();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likeScale] = useState(new Animated.Value(1));

  /**
   * Load initial state
   */
  useEffect(() => {
    const loadState = async () => {
      setIsLoading(true);
      const [liked, saved] = await Promise.all([
        isDriveLiked(driveId),
        isDriveSaved(driveId),
      ]);
      setIsLiked(liked);
      setIsSaved(saved);
      setIsLoading(false);
    };

    loadState();
  }, [driveId, isDriveLiked, isDriveSaved]);

  /**
   * Animate the heart icon
   */
  const animateHeart = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [likeScale]);

  /**
   * Toggle like status with optimistic update
   */
  const toggleLike = useCallback(async () => {
    const newLikedState = !isLiked;
    
    // Optimistic update
    setIsLiked(newLikedState);
    if (newLikedState) {
      animateHeart();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // API call
    const { error } = newLikedState 
      ? await likeDrive(driveId)
      : await unlikeDrive(driveId);

    // Revert on error
    if (error) {
      setIsLiked(!newLikedState);
      console.error('Error toggling like:', error);
    }
  }, [isLiked, driveId, likeDrive, unlikeDrive, animateHeart]);

  /**
   * Toggle save status with optimistic update
   */
  const toggleSave = useCallback(async () => {
    const newSavedState = !isSaved;
    
    // Optimistic update
    setIsSaved(newSavedState);
    if (newSavedState) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // API call
    const { error } = newSavedState
      ? await saveDrive(driveId)
      : await unsaveDrive(driveId);

    // Revert on error
    if (error) {
      setIsSaved(!newSavedState);
      console.error('Error toggling save:', error);
    }
  }, [isSaved, driveId, saveDrive, unsaveDrive]);

  return {
    isLiked,
    isSaved,
    isLoading,
    likeScale,
    toggleLike,
    toggleSave,
  };
}
