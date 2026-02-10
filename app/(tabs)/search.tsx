import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase, Drive } from '@/lib/supabase';

// Available tags for filtering
const AVAILABLE_TAGS = [
  'Scenic', 'Twisty', 'Coastal', 'Mountain', 
  'Urban', 'Highway', 'Off-road'
];

interface DriveWithAuthor extends Drive {
  profiles: { username: string; profile_photo_url?: string | null };
  photos: { photo_url: string }[];
  likes_count: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [results, setResults] = useState<DriveWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search drives
  const searchDrives = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('drives')
        .select(`
          *,
          profiles:user_id (username, profile_photo_url),
          photos:drive_photos (photo_url),
          likes_count:likes (count)
        `);

      // Text search on title/description
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Filter by tags
      if (selectedTags.length > 0) {
        query = query.overlaps('tags', selectedTags);
      }

      // Filter by rating
      if (minRating) {
        query = query.gte('rating', minRating);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformed = (data || []).map((drive: any) => ({
        ...drive,
        likes_count: drive.likes_count?.[0]?.count || 0,
      }));

      setResults(transformed);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedTags, minRating]);

  // Auto-search when filters change
  useEffect(() => {
    const timeout = setTimeout(searchDrives, 300);
    return () => clearTimeout(timeout);
  }, [searchDrives]);

  const onRefresh = () => {
    setRefreshing(true);
    searchDrives();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const renderDrive = ({ item }: { item: DriveWithAuthor }) => (
    <TouchableOpacity
      style={styles.driveCard}
      onPress={() => router.push(`/drive/${item.id}`)}
    >
      {item.photos?.[0]?.photo_url && (
        <View style={styles.imageContainer}>
          {/* Image placeholder - would use Image component */}
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image" size={32} color="#ccc" />
          </View>
        </View>
      )}
      <View style={styles.driveInfo}>
        <Text style={styles.driveTitle}>{item.title}</Text>
        <Text style={styles.authorName}>by {item.profiles.username}</Text>
        {item.rating && (
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < item.rating! ? 'star' : 'star-outline'}
                size={14}
                color={i < item.rating! ? '#FFD700' : '#ccc'}
              />
            ))}
          </View>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drives..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Tags</Text>
        <View style={styles.tagsContainer}>
          {AVAILABLE_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.filterTag,
                selectedTags.includes(tag) && styles.filterTagActive,
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text
                style={[
                  styles.filterTagText,
                  selectedTags.includes(tag) && styles.filterTagTextActive,
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating Filter */}
        <Text style={styles.filterLabel}>Minimum Rating</Text>
        <View style={styles.ratingFilter}>
          {[null, 3, 4, 5].map(rating => (
            <TouchableOpacity
              key={rating ?? 'any'}
              style={[
                styles.ratingButton,
                minRating === rating && styles.ratingButtonActive,
              ]}
              onPress={() => setMinRating(rating)}
            >
              <Text
                style={[
                  styles.ratingButtonText,
                  minRating === rating && styles.ratingButtonTextActive,
                ]}
              >
                {rating ? `${rating}+ ★` : 'Any'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        renderItem={renderDrive}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedTags.length > 0 || minRating
                ? 'No drives found'
                : 'Search for drives or apply filters'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.resultsList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTagActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterTagText: {
    fontSize: 13,
    color: '#333',
  },
  filterTagTextActive: {
    color: '#fff',
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  ratingButtonActive: {
    backgroundColor: '#000',
  },
  ratingButtonText: {
    fontSize: 14,
    color: '#333',
  },
  ratingButtonTextActive: {
    color: '#fff',
  },
  resultsList: {
    padding: 16,
    gap: 16,
  },
  driveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driveInfo: {
    padding: 16,
  },
  driveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
