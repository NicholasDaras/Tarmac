import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Set Mapbox access token from env
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

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
 * Displays a Mapbox map with route line and stop markers
 */
export function RouteMap({ routeCoordinates, stops, height = 200, onExpand }: RouteMapProps) {
  if (!MAPBOX_TOKEN) {
    return (
      <View style={[styles.container, { height }, styles.errorContainer]}>
        <Ionicons name="map-outline" size={32} color="#ccc" />
        <Text style={styles.errorText}>Mapbox token not configured</Text>
      </View>
    );
  }

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
  const latDelta = Math.max(...latitudes) - Math.min(...latitudes) || 0.1;
  const lngDelta = Math.max(...longitudes) - Math.min(...longitudes) || 0.1;

  return (
    <View style={[styles.container, { height }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Mapbox.Camera
          centerCoordinate={[centerLng, centerLat]}
          zoomLevel={12}
          animationMode="moveTo"
        />

        {/* Route Line */}
        {validCoordinates.length > 1 && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: validCoordinates.map(p => [p.longitude, p.latitude]),
              },
            }}
          >
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: '#FF0000',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Stop Markers */}
        {validStops.map((stop, index) => (
          <Mapbox.PointAnnotation
            key={`stop-${index}`}
            id={`stop-${index}`}
            coordinate={[stop.longitude, stop.latitude]}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
            <Mapbox.Callout title={stop.name} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

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
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
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
