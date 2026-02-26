import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  requestPermissions,
  startTracking,
  stopTracking,
  isCurrentlyTracking,
  loadDraft,
  clearDraft,
  formatDistance,
  formatDuration,
  computeTotalDistanceMeters,
  RouteDraft,
} from '@/lib/gps-tracker';

type ScreenState = 'idle' | 'recording' | 'draft';

export default function CreateScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>('idle');
  const [draft, setDraft] = useState<RouteDraft | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh state every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      checkState();
    }, [])
  );

  // Elapsed timer while recording
  useEffect(() => {
    if (state !== 'recording') return;
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [state]);

  const checkState = async () => {
    const tracking = await isCurrentlyTracking();
    const currentDraft = await loadDraft();
    setDraft(currentDraft);
    if (tracking) {
      setState('recording');
      if (currentDraft) {
        setElapsed(Math.round((Date.now() - currentDraft.startedAt) / 1000));
      }
    } else if (currentDraft) {
      setState('draft');
    } else {
      setState('idle');
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Location Permission Required',
          'Please allow "Always" location access so Tarmac can record your route while driving.',
        );
        return;
      }
      await startTracking();
      setElapsed(0);
      setState('recording');
    } catch (e) {
      Alert.alert('Error', 'Could not start GPS tracking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Drive?',
      'Stop recording and go to the publish screen?',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            setIsLoading(true);
            try {
              const finished = await stopTracking();
              if (!finished || finished.points.length < 2) {
                Alert.alert('No Route Recorded', 'Not enough GPS points were captured. Check that location permission is set to "Always".');
                await clearDraft();
                setState('idle');
                return;
              }
              setState('idle');
              router.push({
                pathname: '/drive/review' as any,
                params: { draftPointsJson: JSON.stringify(finished.points) },
              });
            } catch (e) {
              Alert.alert('Error', 'Could not stop recording. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePublishDraft = () => {
    if (!draft) return;
    router.push({
      pathname: '/drive/review' as any,
      params: { draftPointsJson: JSON.stringify(draft.points) },
    });
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Drive?',
      'This will permanently delete your recorded route.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            setDraft(null);
            setState('idle');
          },
        },
      ]
    );
  };

  // ── Recording ──────────────────────────────────────────────────────
  if (state === 'recording') {
    const distMeters = draft ? computeTotalDistanceMeters(draft.points) : 0;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>RECORDING</Text>
          </View>

          <Text style={styles.timer}>{formatDuration(elapsed * 1000)}</Text>

          <Text style={styles.statsText}>
            {draft?.points.length ?? 0} points · {formatDistance(distMeters)}
          </Text>

          <Text style={styles.hint}>
            You can lock your screen.{'\n'}Your route is being tracked in the background.
          </Text>

          <TouchableOpacity
            style={[styles.finishButton, isLoading && styles.disabled]}
            onPress={handleFinish}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.finishButtonText}>Finish Drive</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Draft saved ────────────────────────────────────────────────────
  if (state === 'draft') {
    const distMeters = draft ? computeTotalDistanceMeters(draft.points) : 0;
    const durationMs = draft ? Date.now() - draft.startedAt : 0;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Drive</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color="#000" style={{ marginBottom: 16 }} />
          <Text style={styles.draftTitle}>Drive Saved</Text>
          <Text style={styles.draftMeta}>
            {draft?.points.length ?? 0} GPS points · {formatDistance(distMeters)}
          </Text>

          <TouchableOpacity style={styles.startButton} onPress={handlePublishDraft} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>Review & Publish</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardButton} onPress={handleDiscard} activeOpacity={0.8}>
            <Text style={styles.discardText}>Discard Drive</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Drive</Text>
      </View>
      <View style={styles.centered}>
        <Ionicons name="car-sport-outline" size={72} color="#000" style={{ marginBottom: 24 }} />
        <Text style={styles.idleTitle}>Ready to drive?</Text>
        <Text style={styles.idleSubtitle}>
          Tap record and Tarmac will track your route automatically.
          You can lock your screen while driving.
        </Text>

        <TouchableOpacity
          style={[styles.startButton, isLoading && styles.disabled]}
          onPress={handleStart}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.startButtonText}>Start Drive</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  // Idle
  idleTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  idleSubtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  startButton: {
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 18,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Recording
  recordingBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF0000', marginRight: 8 },
  recordingLabel: { fontSize: 13, fontWeight: '700', color: '#FF0000', letterSpacing: 2 },
  timer: { fontSize: 64, fontWeight: '200', color: '#000', marginBottom: 8, fontVariant: ['tabular-nums'] },
  statsText: { fontSize: 14, color: '#666', marginBottom: 8 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 48 },
  finishButton: {
    backgroundColor: '#FF0000', borderRadius: 12, paddingVertical: 18,
    alignItems: 'center', width: '100%',
  },
  finishButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Draft
  draftTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  draftMeta: { fontSize: 14, color: '#666', marginBottom: 36 },
  discardButton: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', width: '100%',
  },
  discardText: { color: '#999', fontSize: 15 },

  disabled: { opacity: 0.6 },
});
