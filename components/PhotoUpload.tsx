import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

/**
 * Photo Upload Component
 * 
 * Allows users to select and preview photos.
 * - Uses expo-image-picker for selection
 * - Compresses images using expo-image-manipulator
 * - Shows horizontal scrollable preview
 * - Supports add/remove operations
 */
export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 10 }: PhotoUploadProps) {
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload photos.'
      );
      return false;
    }
    return true;
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize to max width of 1200px
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };

  const pickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      // Compress each selected image
      const compressedUris = await Promise.all(
        result.assets.map((asset) => compressImage(asset.uri))
      );
      onPhotosChange([...photos, ...compressedUris]);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const remainingSlots = maxPhotos - photos.length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Photos ({photos.length}/{maxPhotos})
      </Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+</Text>
            <Text style={styles.addButtonSubtext}>
              {remainingSlots} remaining
            </Text>
          </TouchableOpacity>
        )}

        {/* Photo Previews */}
        {photos.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.photoContainer}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 32,
    color: '#FF0000',
    fontWeight: '300',
  },
  addButtonSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
});
