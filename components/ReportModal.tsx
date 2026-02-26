import { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useModeration } from '@/lib/moderation-context';
import { ReportReason } from '@/lib/supabase';

const REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam',          label: 'Spam',               description: 'Repetitive, irrelevant, or promotional content' },
  { value: 'inappropriate', label: 'Inappropriate',      description: 'Offensive, explicit, or harmful content' },
  { value: 'harassment',    label: 'Harassment',         description: 'Targeted abuse, threats, or bullying' },
  { value: 'misleading',    label: 'Misleading',         description: 'False information or deceptive content' },
  { value: 'other',         label: 'Something else',     description: 'Describe your concern below' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'drive' | 'comment' | 'user';
  targetId: string;
}

export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const { reportDrive, reportComment, reportUser } = useModeration();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSelectedReason(null);
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    const detail = description.trim() || undefined;
    let result: { error: Error | null };

    if (targetType === 'drive')   result = await reportDrive(targetId, selectedReason, detail);
    else if (targetType === 'comment') result = await reportComment(targetId, selectedReason, detail);
    else                           result = await reportUser(targetId, selectedReason, detail);

    setSubmitting(false);

    if (result.error) {
      Alert.alert('Error', 'Could not submit your report. Please try again.');
      return;
    }

    reset();
    onClose();
    Alert.alert(
      'Report Submitted',
      'Thank you for helping keep Tarmac safe. We will review this shortly.',
      [{ text: 'OK' }]
    );
  };

  const targetLabel = targetType === 'drive' ? 'Drive' : targetType === 'comment' ? 'Comment' : 'User';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetLabel}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Why are you reporting this {targetLabel.toLowerCase()}?</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Reason list */}
            {REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonRow, selectedReason === r.value && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(r.value)}
                activeOpacity={0.7}
              >
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, selectedReason === r.value && styles.reasonLabelSelected]}>
                    {r.label}
                  </Text>
                  <Text style={styles.reasonDesc}>{r.description}</Text>
                </View>
                <View style={[styles.radio, selectedReason === r.value && styles.radioSelected]}>
                  {selectedReason === r.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Optional description */}
            <Text style={styles.detailLabel}>Additional details (optional)</Text>
            <TextInput
              style={styles.detailInput}
              placeholder="Tell us more..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/300</Text>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (!selectedReason || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Submit Report</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
    alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },

  reasonRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  reasonRowSelected: { backgroundColor: '#FAFAFA' },
  reasonText: { flex: 1 },
  reasonLabel: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  reasonLabelSelected: { color: '#000' },
  reasonDesc: { fontSize: 13, color: '#999' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  radioSelected: { borderColor: '#000' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#000' },

  detailLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 20, marginBottom: 8 },
  detailInput: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#000', height: 80, backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 12, color: '#CCC', textAlign: 'right', marginTop: 4 },

  submitBtn: {
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { fontSize: 15, color: '#999' },
});
