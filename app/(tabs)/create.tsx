import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PhotoUpload } from '@/components/PhotoUpload';
import { StarRating } from '@/components/StarRating';
import { TagSelector, TagType } from '@/components/TagSelector';
import { PointsOfInterest, PointOfInterest } from '@/components/PointsOfInterest';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { EncodingType } from 'expo-file-system';

/**
 * Create Drive Screen
 * 
 * Full-featured screen for creating new drive posts.
 * Includes photo upload, drive details, star rating, tags,
 * points of interest, and publishing to Supabase.
 */
export default function CreateScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [stops, setStops] = useState<PointOfInterest[]>([]);

  // Toggle tag selection
  const handleTagToggle = (tag: TagType) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Upload photo to Supabase Storage
  const uploadPhoto = async (uri: string, driveId: string, index: number): Promise<string | null> => {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });

      // Generate unique filename
      const fileExt = 'jpg';
      const fileName = `${driveId}/${Date.now()}_${index}.${fileExt}`;
      const filePath = `drives/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('drives')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('drives')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your drive.');
      return false;
    }
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo.');
      return false;
    }
    return true;
  };

  // Handle publish
  const handlePublish = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to create a drive.');
        setIsLoading(false);
        return;
      }

      // Create drive record
      const { data: driveData, error: driveError } = await supabase
        .from('drives')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          rating: rating > 0 ? rating : null,
          route_data: routeDescription.trim() ? { description: routeDescription.trim() } : null,
          tags: selectedTags,
        })
        .select('id')
        .single();

      if (driveError || !driveData) {
        console.error('Drive creation error:', driveError);
        Alert.alert('Error', 'Failed to create drive. Please try again.');
        setIsLoading(false);
        return;
      }

      const driveId = driveData.id;

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhoto(photos[i], driveId, i);
        if (url) {
          photoUrls.push(url);
        }
      }

      // Insert photo records
      if (photoUrls.length > 0) {
        const photoRecords = photoUrls.map((url, index) => ({
          drive_id: driveId,
          photo_url: url,
          order_index: index,
        }));

        const { error: photosError } = await supabase
          .from('drive_photos')
          .insert(photoRecords);

        if (photosError) {
          console.error('Photos insert error:', photosError);
        }
      }

      // Insert stops if any
      if (stops.length > 0) {
        const stopRecords = stops.map((stop, index) => ({
          drive_id: driveId,
          name: stop.name,
          description: stop.description || null,
          order_index: index,
        }));

        const { error: stopsError } = await supabase
          .from('drive_stops')
          .insert(stopRecords);

        if (stopsError) {
          console.error('Stops insert error:', stopsError);
        }
      }

      Alert.alert('Success', 'Your drive has been published!', [
        {
          text: 'View Feed',
          onPress: () => router.push('/(tabs)/feed'),
        },
      ]);

      // Reset form
      setPhotos([]);
      setTitle('');
      setDescription('');
      setRouteDescription('');
      setRating(0);
      setSelectedTags([]);
      setStops([]);

    } catch (error) {
      console.error('Publish error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Drive</Text>
          </View>

          {/* Photo Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Photos <Text style={styles.required}>*</Text>
            </Text>
            <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={10} />
          </View>

          {/* Drive Details Form */}
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

            <Text style={styles.sectionLabel}>Route Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Highway 1 from SF to Monterey"
              placeholderTextColor="#999"
              value={routeDescription}
              onChangeText={setRouteDescription}
              maxLength={200}
            />
          </View>

          {/* Star Rating */}
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

          {/* Publish Button */}
          <TouchableOpacity
            style={[styles.publishButton, isLoading && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.publishButtonText}>Publish Drive</Text>
            )}
          </TouchableOpacity>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#FF0000',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  publishButton: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
});
