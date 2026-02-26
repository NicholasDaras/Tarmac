import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Drive, Profile } from '../../../lib/supabase';
import { SocialActionBar } from '../../../components/SocialActionBar';
import { CommentsModal } from '../../../components/CommentsModal';

const PAGE_SIZE = 15;

type DriveWithAuthor = Drive & {
  profiles: Profile;
  photos: { photo_url: string }[];
  likes_count: number;
  comments_count: number;
};

// ── Skeleton card shown while loading ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonName} />
      </View>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const [drives, setDrives] = useState<DriveWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const cursorRef = useRef<string | null>(null); // created_at of last item

  const fetchDrives = useCallback(async (cursor: string | null = null) => {
    try {
      let query = supabase
        .from('drives')
        .select(`
          *,
          profiles:user_id (id, username, full_name, profile_photo_url),
          photos:drive_photos (photo_url),
          likes_count:likes (count),
          comments_count:comments (count)
        `)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformed = (data || []).map((drive: any) => ({
        ...drive,
        likes_count: drive.likes_count?.[0]?.count || 0,
        comments_count: drive.comments_count?.[0]?.count || 0,
      }));

      if (cursor) {
        setDrives(prev => [...prev, ...transformed]);
      } else {
        setDrives(transformed);
      }

      setHasMore(transformed.length === PAGE_SIZE);
      if (transformed.length > 0) {
        cursorRef.current = transformed[transformed.length - 1].created_at;
      }
    } catch (error) {
      console.error('Error fetching drives:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const onRefresh = () => {
    cursorRef.current = null;
    setHasMore(true);
    setRefreshing(true);
    fetchDrives(null);
  };

  const onEndReached = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchDrives(cursorRef.current);
  };

  const openComments = (driveId: string) => {
    setSelectedDriveId(driveId);
    setIsCommentsVisible(true);
  };

  const closeComments = () => {
    setIsCommentsVisible(false);
    setSelectedDriveId(null);
    fetchDrives(null);
  };

  const renderDriveCard = ({ item }: { item: DriveWithAuthor }) => {
    const firstPhoto = item.photos?.[0]?.photo_url;
    const author = item.profiles;

    return (
      <View style={styles.card}>
        {/* Author header */}
        <TouchableOpacity
          style={styles.authorHeader}
          onPress={() => router.push(`/profile/${author.id}`)}
        >
          <Image
            source={{ uri: author.profile_photo_url ?? undefined }}
            style={styles.authorAvatar}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
          <Text style={styles.authorName}>{author.username}</Text>
        </TouchableOpacity>

        {/* Drive photo */}
        <TouchableOpacity onPress={() => router.push(`/drive/${item.id}`)}>
          {firstPhoto ? (
            <Image
              source={{ uri: firstPhoto }}
              style={styles.driveImage}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={300}
            />
          ) : (
            <View style={styles.driveImagePlaceholder}>
              <Ionicons name="car-sport-outline" size={40} color="#ccc" />
            </View>
          )}
        </TouchableOpacity>

        {/* Social actions */}
        <SocialActionBar
          driveId={item.id}
          likesCount={item.likes_count}
          commentsCount={item.comments_count}
          onCommentPress={() => openComments(item.id)}
        />

        {/* Drive info */}
        <TouchableOpacity
          style={styles.driveInfo}
          onPress={() => router.push(`/drive/${item.id}`)}
        >
          <Text style={styles.driveTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.driveDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {item.rating ? (
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
          ) : null}

          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TARMAC</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Skeleton while initial load */}
      {loading ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={drives}
          renderItem={renderDriveCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-sport-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>No drives yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to share a drive!{'\n'}Tap the + tab to start recording.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/create')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>Start a Drive</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {selectedDriveId && (
        <CommentsModal
          driveId={selectedDriveId}
          isVisible={isCommentsVisible}
          onClose={closeComments}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  listContent: { padding: 16, gap: 16, paddingBottom: 32 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  authorHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0' },
  authorName: { fontWeight: '600', fontSize: 14 },
  driveImage: { width: '100%', height: 240 },
  driveImagePlaceholder: {
    width: '100%', height: 240,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center',
  },
  driveInfo: { padding: 12 },
  driveTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  driveDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#666' },

  // Pagination footer
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyButton: {
    backgroundColor: '#000', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Skeletons
  skeletonList: { padding: 16, gap: 16 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  skeletonAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFEFEF' },
  skeletonName: { width: 100, height: 14, borderRadius: 7, backgroundColor: '#EFEFEF' },
  skeletonImage: { width: '100%', height: 240, backgroundColor: '#EFEFEF' },
  skeletonBody: { padding: 12, gap: 8 },
  skeletonTitle: { width: '60%', height: 18, borderRadius: 9, backgroundColor: '#EFEFEF' },
  skeletonSubtitle: { width: '40%', height: 14, borderRadius: 7, backgroundColor: '#EFEFEF' },
});
