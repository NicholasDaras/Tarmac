import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import {
  loadPendingUploads,
  removePendingUpload,
  PendingUpload,
} from '@/lib/upload-queue';
import {
  computeTotalDistanceMeters,
} from '@/lib/gps-tracker';

interface PendingUploadBannerProps {
  /** Called after all pending uploads are processed successfully */
  onSuccess: () => void;
}

async function uploadPhotoFromQueue(
  uri: string,
  driveId: string,
  index: number
): Promise<string | null> {
  try {
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
}

async function processUpload(upload: PendingUpload): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const routePoints = upload.routePoints;
    const routeData = routePoints.length > 1
      ? {
          coordinates: routePoints.map(p => ({ lat: p.latitude, lng: p.longitude, t: p.timestamp })),
          distance_meters: computeTotalDistanceMeters(routePoints),
          duration_seconds: Math.round(
            (routePoints[routePoints.length - 1].timestamp - routePoints[0].timestamp) / 1000
          ),
        }
      : null;

    const { data: driveData, error: driveError } = await supabase
      .from('drives')
      .insert({
        user_id: user.id,
        title: upload.title,
        description: upload.description || null,
        rating: upload.rating > 0 ? upload.rating : null,
        route_data: routeData,
        tags: upload.tags,
      })
      .select('id')
      .single();

    if (driveError || !driveData) return false;

    const driveId = driveData.id;

    // Upload photos (stashed in documentDirectory)
    const photoUrls: string[] = [];
    for (let i = 0; i < upload.stablePhotoPaths.length; i++) {
      const url = await uploadPhotoFromQueue(upload.stablePhotoPaths[i], driveId, i);
      if (url) photoUrls.push(url);
    }

    if (photoUrls.length > 0) {
      await supabase.from('drive_photos').insert(
        photoUrls.map((url, index) => ({ drive_id: driveId, photo_url: url, order_index: index }))
      );
    }

    if (upload.stops.length > 0) {
      await supabase.from('drive_stops').insert(
        upload.stops.map((stop, index) => ({
          drive_id: driveId,
          name: stop.name,
          description: stop.description || null,
          order_index: index,
        }))
      );
    }

    return true;
  } catch {
    return false;
  }
}

export function PendingUploadBanner({ onSuccess }: PendingUploadBannerProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const refreshCount = useCallback(async () => {
    const uploads = await loadPendingUploads();
    setPendingCount(uploads.length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Watch connectivity — auto-process queue when connection restores
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false;
      setIsOnline(connected);
      if (connected && pendingCount > 0 && !isUploading) {
        handleProcessQueue();
      }
    });
    return () => unsubscribe();
  }, [pendingCount, isUploading]);

  const handleProcessQueue = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const uploads = await loadPendingUploads();
    let successCount = 0;

    for (const upload of uploads) {
      const ok = await processUpload(upload);
      if (ok) {
        await removePendingUpload(upload.id);
        successCount++;
      }
    }

    setIsUploading(false);
    await refreshCount();

    if (successCount > 0) {
      onSuccess();
      if (successCount < uploads.length) {
        Alert.alert(
          'Partial Upload',
          `${successCount} of ${uploads.length} drives uploaded. The rest will retry automatically.`
        );
      }
    } else if (uploads.length > 0) {
      Alert.alert('Upload Failed', 'Could not upload your drives. Check your connection and try again.');
    }
  };

  // Don't render if nothing pending
  if (pendingCount === 0) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        {isUploading
          ? <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
          : null
        }
        <Text style={styles.text}>
          {isUploading
            ? `Uploading ${pendingCount} drive${pendingCount !== 1 ? 's' : ''}…`
            : isOnline
            ? `${pendingCount} drive${pendingCount !== 1 ? 's' : ''} pending upload`
            : `${pendingCount} drive${pendingCount !== 1 ? 's' : ''} saved offline`
          }
        </Text>
      </View>
      {!isUploading && isOnline && (
        <TouchableOpacity onPress={handleProcessQueue} style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>Upload Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  uploadBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
