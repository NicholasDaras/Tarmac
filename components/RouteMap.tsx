import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MapPoint {
  latitude: number;
  longitude: number;
}

interface RouteMapProps {
  routeCoordinates?: MapPoint[];
  stops?: { latitude?: number | null; longitude?: number | null; name: string }[];
  height?: number;
  onExpand?: () => void;
}

/**
 * RouteMap Component
 * 
 * Displays a Google Maps with route line and stop markers
 */
export function RouteMap({ routeCoordinates, stops, height = 200, onExpand }: RouteMapProps) {
  // Filter valid coordinates
  const validCoordinates = (routeCoordinates || [])
    .filter((point): point is MapPoint => 
      typeof point.latitude === 'number' && typeof point.longitude === 'number'
    );

  const validStops = (stops || [])
    .filter((stop): stop is { latitude: number; longitude: number; name: string } =>
      typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
    );

  if (validCoordinates.length === 0 && validStops.length === 0) {
    return null;
  }

  // Calculate initial region
  const allPoints = [...validCoordinates, ...validStops.map(s => ({ latitude: s.latitude, longitude: s.longitude }))];
  const centerLat = allPoints.reduce((sum, p) => sum + p.latitude, 0) / allPoints.length;
  const centerLng = allPoints.reduce((sum, p) => sum + p.longitude, 0) / allPoints.length;
  
  // Calculate bounds for zoom
  const latitudes = allPoints.map(p => p.latitude);
  const longitudes = allPoints.map(p => p.longitude);
  const latDelta = Math.max(0.02, Math.max(...latitudes) - Math.min(...latitudes) || 0.1);
  const lngDelta = Math.max(0.02, Math.max(...longitudes) - Math.min(...longitudes) || 0.1);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {/* Route Line */}
        {validCoordinates.length > 1 && (
          <Polyline
            coordinates={validCoordinates}
            strokeColor="#FF0000"
            strokeWidth={4}
          />
        )}

        {/* Stop Markers */}
        {validStops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={{
              latitude: stop.latitude,
              longitude: stop.longitude,
            }}
            title={stop.name}
            description={`Stop ${index + 1}`}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Expand Button */}
      {onExpand && (
        <TouchableOpacity style={styles.expandButton} onPress={onExpand}>
          <Ionicons name="expand" size={20} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
