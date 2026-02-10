import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
}

/**
 * Star Rating Component
 * 
 * Displays 5 stars that users can tap to rate.
 * Filled stars show the selected rating, outlined stars are unselected.
 */
export function StarRating({ rating, onRatingChange, size = 32 }: StarRatingProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRatingChange(star)}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.star, { fontSize: size }, star <= rating && styles.starFilled]}>
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 4,
  },
  star: {
    color: '#999',
    lineHeight: 36,
  },
  starFilled: {
    color: '#FF0000',
  },
});
