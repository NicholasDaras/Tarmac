import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { PhotoGallery } from '@/components/PhotoGallery';
import { DriveHeader } from '@/components/DriveHeader';
import { EngagementBar } from '@/components/EngagementBar';
import { StopsList } from '@/components/StopsList';
import { CommentsSection } from '@/components/CommentsSection';
import { RouteMap } from '@/components/RouteMap';
import { supabase, Drive, Profile, DrivePhoto, DriveStop } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
type Comment = {
  id: string;
  drive_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profiles: Profile;
};

type DriveWithDetails = Drive & {
  profiles: Profile;
  photos: DrivePhoto[];
  stops: DriveStop[];
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
};

export default function DriveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [drive, setDrive] = useState<DriveWithDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);

  // Fetch drive data
  const fetchDrive = useCallback(async () => {
    if (!id) return;

    try {
      const { data: driveData, error: driveError } = await supabase
        .from('drives')
        .select(`
          *,
          profiles:user_id (*),
          photos:drive_photos (*),
          stops:drive_stops (*)
        `)
        .eq('id', id)
        .single();

      if (driveError) throw driveError;

      // Get likes count
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('drive_id', id);

      // Check if user liked/saved
      let userHasLiked = false;
      let userHasSaved = false;

      if (user) {
        const [{ data: likeData }, { data: saveData }] = await Promise.all([
          supabase.from('likes').select('id').eq('drive_id', id).eq('user_id', user.id).single(),
          supabase.from('saves').select('id').eq('drive_id', id).eq('user_id', user.id).single(),
        ]);
        userHasLiked = !!likeData;
        userHasSaved = !!saveData;
      }

      // Get comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('drive_id', id);

      setDrive({
        ...driveData,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_has_liked: userHasLiked,
        user_has_saved: userHasSaved,
      });
    } catch (error) {
      console.error('Error fetching drive:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (*)
        `)
        .eq('drive_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchDrive();
    fetchComments();
  }, [fetchDrive, fetchComments]);

  // Handle like toggle
  const handleLike = async () => {
    if (!user || !drive) return;

    try {
      if (drive.user_has_liked) {
        await supabase.from('likes').delete().eq('drive_id', drive.id).eq('user_id', user.id);
        setDrive({ ...drive, likes_count: drive.likes_count - 1, user_has_liked: false });
      } else {
        await supabase.from('likes').insert({ drive_id: drive.id, user_id: user.id });
        setDrive({ ...drive, likes_count: drive.likes_count + 1, user_has_liked: true });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle save toggle
  const handleSave = async () => {
    if (!user || !drive) return;

    try {
      if (drive.user_has_saved) {
        await supabase.from('saves').delete().eq('drive_id', drive.id).eq('user_id', user.id);
        setDrive({ ...drive, user_has_saved: false });
      } else {
        await supabase.from('saves').insert({ drive_id: drive.id, user_id: user.id });
        setDrive({ ...drive, user_has_saved: true });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!drive) return;
    try {
      await Share.share({
        message: `Check out this drive on Tarmac: ${drive.title}`,
        title: drive.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle submit comment
  const handleSubmitComment = async (text: string) => {
    if (!user || !drive || !text.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          drive_id: drive.id,
          user_id: user.id,
          text: text.trim(),
        })
        .select(`
          *,
          profiles:user_id (*)
        `)
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setDrive({ ...drive, comments_count: drive.comments_count + 1 });
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!drive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Drive not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sortedPhotos = [...drive.photos].sort((a, b) => a.order_index - b.order_index);
  const sortedStops = [...drive.stops].sort((a, b) => a.order_index - b.order_index);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Drive Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        <PhotoGallery
          photos={sortedPhotos}
          currentIndex={currentPhotoIndex}
          onIndexChange={setCurrentPhotoIndex}
          onPhotoPress={(index) => {
            setZoomPhotoIndex(index);
            setZoomModalVisible(true);
          }}
        />

        {/* Drive Header */}
        <DriveHeader
          title={drive.title}
          author={drive.profiles}
          rating={drive.rating}
          tags={drive.tags}
          createdAt={drive.created_at}
        />

        {/* Engagement Bar */}
        <EngagementBar
          likesCount={drive.likes_count}
          commentsCount={drive.comments_count}
          isLiked={drive.user_has_liked}
          isSaved={drive.user_has_saved}
          onLike={handleLike}
          onSave={handleSave}
          onShare={handleShare}
          onComment={() => {/* Scroll to comments */}}
        />

        {/* Stops List */}
        <StopsList stops={sortedStops} />

        {/* Route Map */}
        {sortedStops.length > 0 && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Route</Text>
            <RouteMap
              stops={sortedStops.map(s => ({ 
                latitude: s.latitude, 
                longitude: s.longitude, 
                name: s.name 
              }))}
              height={250}
            />
          </View>
        )}

        {/* Comments Section */}
        <CommentsSection
          comments={comments}
          currentUserId={user?.id}
          onSubmitComment={handleSubmitComment}
          isSubmitting={isSubmittingComment}
        />
      </ScrollView>

      {/* Zoom Modal */}
      <Modal
        visible={zoomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setZoomModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: zoomPhotoIndex * SCREEN_WIDTH, y: 0 }}
          >
            {sortedPhotos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.photo_url }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  mapSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
