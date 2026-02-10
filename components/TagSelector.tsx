import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const PREDEFINED_TAGS = [
  'Scenic',
  'Twisty',
  'Coastal',
  'Mountain',
  'Urban',
  'Highway',
  'Off-road',
] as const;

export type TagType = typeof PREDEFINED_TAGS[number];

interface TagSelectorProps {
  selectedTags: TagType[];
  onTagToggle: (tag: TagType) => void;
}

/**
 * Tag Selector Component
 * 
 * Displays predefined tags as selectable chips.
 * Users can multi-select tags to categorize their drive.
 */
export function TagSelector({ selectedTags, onTagToggle }: TagSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PREDEFINED_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <TouchableOpacity
            key={tag}
            onPress={() => onTagToggle(tag)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  chipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
