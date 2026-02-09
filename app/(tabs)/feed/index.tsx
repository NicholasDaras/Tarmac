import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Drive, Profile } from '../../../lib/supabase';

/**
 * Drive with author info
 */
type DriveWithAuthor = Drive & {
  profiles: Profile;
  photos: { photo_url: string }[];
  likes_count: number;
  comments_count: number;
};

/**
 * Feed Screen
 * 
 * Displays a scrollable list of recent drives from the community.
 * Users can tap a drive to view details.
 */
export default function FeedScreen() {
  const router = useRouter();
  const [drives, setDrives] = useState<DriveWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch drives from Supabase
   */
  const fetchDrives = async () => {
    try {
      const { data, error } = await supabase
        .from('drives')
        .select(`
          *,
          profiles:user_id (id, username, full_name, profile_photo_url),
          photos:drive_photos (photo_url),
          likes_count:likes (count),
          comments_count:comments (count)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform the data to match our type
      const transformedData = (data || []).map((drive: any) => ({
        ...drive,
        likes_count: drive.likes_count?.[0]?.count || 0,
        comments_count: drive.comments_count?.[0]?.count || 0,
      }));

      setDrives(transformedData);
    } catch (error) {
      console.error('Error fetching drives:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDrives();
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    fetchDrives();
  };

  /**
   * Render a single drive card
   */
  const renderDriveCard = ({ item }: { item: DriveWithAuthor }) => {
    const firstPhoto = item.photos?.[0]?.photo_url;
    const author = item.profiles;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/drive/${item.id}`)}
      >
        {/* Author Header */}
        <View style={styles.authorHeader}>
          {author.profile_photo_url ? (
            <Image source={{ uri: author.profile_photo_url }} style={styles.authorAvatar} />
          ) : (
            <View style={styles.authorAvatarPlaceholder}>
              <Ionicons name="person" size={16} color="#999" />
            </View>
          )}
          <Text style={styles.authorName}>{author.username}</Text>
        </View>

        {/* Drive Photo */}
        {firstPhoto && (
          <Image source={{ uri: firstPhoto }} style={styles.driveImage} />
        )}

        {/* Drive Info */}
        <View style={styles.driveInfo}>
          <Text style={styles.driveTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.driveDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {/* Rating */}
          {item.rating && (
            <View style={styles.ratingContainer}>
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

          {/* Engagement Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.likes_count}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.comments_count}</Text>
            </View>
          </View>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TARMAC</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      <FlatList
        data={drives}
        renderItem={renderDriveCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No drives yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share a drive!</Text>
          </View>
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  driveImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  driveInfo: {
    padding: 12,
  },
  driveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  driveDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});
