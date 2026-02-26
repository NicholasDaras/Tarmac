import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PhotoUpload } from '@/components/PhotoUpload';
import { StarRating } from '@/components/StarRating';
import { TagSelector, TagType } from '@/components/TagSelector';
import { PointsOfInterest, PointOfInterest } from '@/components/PointsOfInterest';
import { RouteMap } from '@/components/RouteMap';
import { supabase } from '@/lib/supabase';
import {
  clearDraft,
  loadDraft,
  RoutePoint,
  computeTotalDistanceMeters,
  formatDistance,
  formatDuration,
} from '@/lib/gps-tracker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { useNotifications } from '@/lib/notifications-context';
import NetInfo from '@react-native-community/netinfo';
import { savePendingUpload } from '@/lib/upload-queue';


export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftPointsJson?: string }>();

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [stops, setStops] = useState<PointOfInterest[]>([]);
  const { hasPrompted, registerForPushNotifications } = useNotifications();

  useEffect(() => {
    // Load route points from nav params, fall back to AsyncStorage draft
    if (params.draftPointsJson) {
      try {
        setRoutePoints(JSON.parse(params.draftPointsJson) as RoutePoint[]);
        return;
      } catch {}
    }
    loadDraft().then(d => { if (d) setRoutePoints(d.points); });
  }, []);

  const handleTagToggle = (tag: TagType) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const uploadPhoto = async (uri: string, driveId: string, index: number): Promise<string | null> => {
    try {
      // Compress to 1080px wide at 80% quality — reduces 5-12 MB originals to ~300-600 KB
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: 'base64' });
      const filePath = `drives/${driveId}/${Date.now()}_${index}.jpg`;
      const { error } = await supabase.storage
        .from('drives')
        .upload(filePath, decode(base64), { contentType: 'image/jpeg' });
      if (error) return null;
      const { data: { publicUrl } } = supabase.storage.from('drives').getPublicUrl(filePath);
      return publicUrl;
    } catch {
      return null;
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your drive.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo.');
      return;
    }

    // Check connectivity before attempting upload
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      try {
        await savePendingUpload(
          {
            title: title.trim(),
            description: description.trim(),
            rating,
            tags: selectedTags,
            stops,
            routePoints,
          },
          photos
        );
        await clearDraft();
        Alert.alert(
          "Saved for Later",
          "You're offline. Your drive has been saved and will upload automatically when you reconnect.",
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/feed') }]
        );
      } catch {
        Alert.alert('Error', 'Could not save drive. Please try again.');
      }
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to publish a drive.');
        return;
      }

      // Build route_data — store GPS coordinates in the existing jsonb column
      const routeData = routePoints.length > 1
        ? {
            coordinates: routePoints.map(p => ({ lat: p.latitude, lng: p.longitude, t: p.timestamp })),
            distance_meters: computeTotalDistanceMeters(routePoints),
            duration_seconds: Math.round(
              (routePoints[routePoints.length - 1].timestamp - routePoints[0].timestamp) / 1000
            ),
          }
        : null;

      // Insert drive record
      const { data: driveData, error: driveError } = await supabase
        .from('drives')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          rating: rating > 0 ? rating : null,
          route_data: routeData,
          tags: selectedTags,
        })
        .select('id')
        .single();

      if (driveError || !driveData) {
        Alert.alert('Error', 'Failed to create drive. Please try again.');
        return;
      }

      const driveId = driveData.id;

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhoto(photos[i], driveId, i);
        if (url) photoUrls.push(url);
      }

      if (photoUrls.length > 0) {
        await supabase.from('drive_photos').insert(
          photoUrls.map((url, index) => ({ drive_id: driveId, photo_url: url, order_index: index }))
        );
      }

      // Insert stops
      if (stops.length > 0) {
        await supabase.from('drive_stops').insert(
          stops.map((stop, index) => ({
            drive_id: driveId,
            name: stop.name,
            description: stop.description || null,
            order_index: index,
          }))
        );
      }

      // Clear the GPS draft now that it's published
      await clearDraft();

      // After publishing, prompt for notifications if not yet asked
      if (!hasPrompted) {
        Alert.alert(
          'Stay in the Loop 🔔',
          'Get notified when people like and comment on your drives.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => router.replace('/(tabs)/feed'),
            },
            {
              text: 'Enable Notifications',
              onPress: async () => {
                await registerForPushNotifications();
                router.replace('/(tabs)/feed');
              },
            },
          ]
        );
      } else {
        Alert.alert('Published!', 'Your drive is live on the feed.', [
          { text: 'View Feed', onPress: () => router.replace('/(tabs)/feed') },
        ]);
      }
    } catch (e) {
      console.error('Publish error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const mapCoordinates = routePoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  const distMeters = computeTotalDistanceMeters(routePoints);
  const durationMs = routePoints.length > 1
    ? routePoints[routePoints.length - 1].timestamp - routePoints[0].timestamp
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Review Drive</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Route summary */}
          {mapCoordinates.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Route</Text>
              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Ionicons name="navigate-outline" size={16} color="#666" />
                  <Text style={styles.statText}>{formatDistance(distMeters)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.statText}>{formatDuration(durationMs)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.statText}>{routePoints.length} points</Text>
                </View>
              </View>
              <RouteMap routeCoordinates={mapCoordinates} height={220} />
            </View>
          )}

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Photos <Text style={styles.required}>*</Text>
            </Text>
            <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={10} />
          </View>

          {/* Title & Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Give your drive a name"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your drive experience..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <StarRating rating={rating} onRatingChange={setRating} />
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <TagSelector selectedTags={selectedTags} onTagToggle={handleTagToggle} />
          </View>

          {/* Points of Interest */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Points of Interest (Optional)</Text>
            <PointsOfInterest stops={stops} onStopsChange={setStops} />
          </View>

          {/* Publish */}
          <TouchableOpacity
            style={[styles.publishButton, isLoading && styles.disabled]}
            onPress={handlePublish}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.publishButtonText}>Publish Drive</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  required: { color: '#FF0000' },
  routeStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 14, color: '#666' },
  input: {
    backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: '#000',
    borderWidth: 1, borderColor: '#E8E8E8', marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
  publishButton: {
    backgroundColor: '#FF0000', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
