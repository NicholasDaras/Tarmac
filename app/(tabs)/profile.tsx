import { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, Profile, Drive } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useSocial } from '../../lib/social-context';
import { FollowButton } from '../../components/FollowButton';
import { BlockButton } from '../../components/BlockButton';
import { ReportModal } from '../../components/ReportModal';
import { SocialActionBar } from '../../components/SocialActionBar';
import { CommentsModal } from '../../components/CommentsModal';

/**
 * Drive with photos and stats
 */
type DriveWithPhotos = Drive & {
  photos: { photo_url: string }[];
  likes_count: number;
  comments_count: number;
};

/**
 * Profile Screen
 * 
 * Displays user profile with their drives, follower/following counts,
 * and allows following/unfollowing other users.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user: currentUser, signOut, deleteAccount } = useAuth();
  const { getFollowerCount, getFollowingCount } = useSocial();
  const params = useLocalSearchParams();
  const userId = params.userId as string || currentUser?.id;
  
  const isOwnProfile = userId === currentUser?.id;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [drives, setDrives] = useState<DriveWithPhotos[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [reportUserVisible, setReportUserVisible] = useState(false);

  /**
   * Fetch profile data
   */
  const fetchProfileData = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch drives
      const { data: drivesData, error: drivesError } = await supabase
        .from('drives')
        .select(`
          *,
          photos:drive_photos (photo_url),
          likes_count:likes (count),
          comments_count:comments (count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false
});

      if (drivesError) throw drivesError;

      const transformedDrives = (drivesData || []).map((drive: any) => ({
        ...drive,
        likes_count: drive.likes_count?.[0]?.count || 0,
        comments_count: drive.comments_count?.[0]?.count || 0,
      }));

      setDrives(transformedDrives);

      // Fetch follower and following counts
      const [followers, following] = await Promise.all([
        getFollowerCount(userId),
        getFollowingCount(userId),
      ]);

      setFollowerCount(followers);
      setFollowingCount(following);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, getFollowerCount, getFollowingCount]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  /**
   * Handle sign out
   */
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  /**
   * Handle account deletion — 2-step confirmation (Apple requirement)
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your drives, photos, and profile data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all data will be permanently deleted immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setIsLoading(true);
                    const { error } = await deleteAccount();
                    setIsLoading(false);
                    if (error) {
                      Alert.alert('Error', 'Could not delete account. Please try again or contact support@tarmac.app.');
                    }
                    // On success: auth state change in auth-context redirects to login automatically
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  /**
   * Handle edit profile
   */
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  /**
   * Handle follow count update
   */
  const handleFollowChange = (isFollowing: boolean) => {
    setFollowerCount(prev => isFollowing ? prev + 1 : prev - 1);
  };

  /**
   * Open comments modal
   */
  const openComments = (driveId: string) => {
    setSelectedDriveId(driveId);
    setIsCommentsVisible(true);
  };

  /**
   * Close comments modal
   */
  const closeComments = () => {
    setIsCommentsVisible(false);
    setSelectedDriveId(null);
    fetchProfileData();
  };

  /**
   * Render a drive grid item
   */
  const renderDriveItem = ({ item }: { item: DriveWithPhotos }) => {
    const firstPhoto = item.photos?.[0]?.photo_url;

    return (
      <View style={styles.driveItem}>
        <TouchableOpacity 
          style={styles.driveImageContainer}
          onPress={() => router.push(`/drive/${item.id}`)}
        >
          {firstPhoto ? (
            <Image source={{ uri: firstPhoto }} style={styles.driveImage} />
          ) : (
            <View style={styles.driveImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#ccc" />
            </View>
          )}
        </TouchableOpacity>
        
        <SocialActionBar
          driveId={item.id}
          likesCount={item.likes_count}
          commentsCount={item.comments_count}
          onCommentPress={() => openComments(item.id)}
        />
        
        <Text style={styles.driveTitle} numberOfLines={1}>{item.title}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text>Profile not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isOwnProfile ? 'My Profile' : 'Profile'}</Text>
          {isOwnProfile && (
            <TouchableOpacity onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#999" />
              </View>
            )}
          </View>

          <Text style={styles.username}>{profile.username}</Text>
          
          {profile.full_name && (
            <Text style={styles.fullName}>{profile.full_name}</Text>
          )}

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{drives.length}</Text>
              <Text style={styles.statLabel}>Drives</Text>
            </View>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <View style={styles.dangerZone}>
                <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteAccountBtn}>
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : userId ? (
            <View style={styles.otherUserActions}>
              <FollowButton userId={userId} onFollowChange={handleFollowChange} />
              <BlockButton userId={userId} username={profile?.username ?? ''} />
              <TouchableOpacity
                style={styles.reportUserBtn}
                onPress={() => setReportUserVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Drives Section */}
        <View style={styles.drivesSection}>
          <Text style={styles.sectionTitle}>
            {isOwnProfile ? 'My Drives' : `${profile.username}'s Drives`}
          </Text>
          
          {drives.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No drives yet</Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/(tabs)/create')}
                >
                  <Text style={styles.createButtonText}>Create Your First Drive</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={drives}
              renderItem={renderDriveItem}
              keyExtractor={(item) => item.id}
              numColumns={1}
              scrollEnabled={false}
              contentContainerStyle={styles.drivesList}
            />
          )}
        </View>
      </ScrollView>

      {/* Comments Modal */}
      {reportUserVisible && userId && (
        <ReportModal
          visible={reportUserVisible}
          onClose={() => setReportUserVisible(false)}
          targetType="user"
          targetId={userId}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 17,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  drivesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  drivesList: {
    gap: 16,
  },
  driveItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  driveImageContainer: {
    width: '100%',
    height: 200,
  },
  driveImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  driveImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driveTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  otherUserActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportUserBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  dangerZone: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    alignItems: 'center',
    width: '100%',
  },
  deleteAccountBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
});
