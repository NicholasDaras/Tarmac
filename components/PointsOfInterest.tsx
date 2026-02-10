import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export interface PointOfInterest {
  id: string;
  name: string;
  description: string;
}

interface PointsOfInterestProps {
  stops: PointOfInterest[];
  onStopsChange: (stops: PointOfInterest[]) => void;
}

/**
 * Points of Interest Component
 * 
 * Allows users to add optional stops along their drive route.
 * Each stop has a name and description.
 */
export function PointsOfInterest({ stops, onStopsChange }: PointsOfInterestProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopDescription, setNewStopDescription] = useState('');

  const addStop = () => {
    if (newStopName.trim()) {
      const newStop: PointOfInterest = {
        id: Date.now().toString(),
        name: newStopName.trim(),
        description: newStopDescription.trim(),
      };
      onStopsChange([...stops, newStop]);
      setNewStopName('');
      setNewStopDescription('');
      setIsAdding(false);
    }
  };

  const removeStop = (id: string) => {
    onStopsChange(stops.filter((stop) => stop.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Add Stop Button */}
      {!isAdding && (
        <TouchableOpacity
          onPress={() => setIsAdding(true)}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Add Stop</Text>
        </TouchableOpacity>
      )}

      {/* Add Stop Form */}
      {isAdding && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Stop name (e.g., Mountain View Point)"
            placeholderTextColor="#999"
            value={newStopName}
            onChangeText={setNewStopName}
            autoFocus
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor="#999"
            value={newStopDescription}
            onChangeText={setNewStopDescription}
            multiline
            numberOfLines={2}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              onPress={() => {
                setIsAdding(false);
                setNewStopName('');
                setNewStopDescription('');
              }}
              style={[styles.formButton, styles.cancelButton]}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={addStop}
              style={[styles.formButton, styles.saveButton]}
              activeOpacity={0.7}
              disabled={!newStopName.trim()}
            >
              <Text style={styles.saveButtonText}>Add Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stops List */}
      {stops.length > 0 && (
        <ScrollView style={styles.stopsList}>
          {stops.map((stop, index) => (
            <View key={stop.id} style={styles.stopItem}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stopContent}>
                <Text style={styles.stopName}>{stop.name}</Text>
                {stop.description ? (
                  <Text style={styles.stopDescription}>{stop.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => removeStop(stop.id)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#FF0000',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopsList: {
    maxHeight: 200,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopContent: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  stopDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});
