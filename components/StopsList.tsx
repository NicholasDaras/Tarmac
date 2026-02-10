import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface Stop {
  id: string;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  order_index: number;
}

interface StopsListProps {
  stops: Stop[];
}

/**
 * StopsList Component
 * 
 * Displays list of points of interest/stops on the drive
 */
export function StopsList({ stops }: StopsListProps) {
  if (!stops || stops.length === 0) return null;

  const sortedStops = [...stops].sort((a, b) => a.order_index - b.order_index);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Stops</Text>
      {sortedStops.map((stop, index) => (
        <View key={stop.id} style={styles.stopItem}>
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.stopContent}>
            <Text style={styles.stopName}>{stop.name}</Text>
            {stop.description && (
              <Text style={styles.stopDescription}>{stop.description}</Text>
            )}
          </View>
          {stop.photo_url && (
            <Image source={{ uri: stop.photo_url }} style={styles.stopImage} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stopContent: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stopDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stopImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
});
