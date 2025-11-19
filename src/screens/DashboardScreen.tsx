import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export default function DashboardScreen() {
  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: locations, isLoading: loadingLocations } = useQuery({
    queryKey: ['locations', 'latest'],
    queryFn: () => api.getLatestLocations(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (loadingVehicles || loadingLocations) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const activeVehicles = vehicles?.filter(v => v.status === 'active').length || 0;
  const stoppedVehicles = vehicles?.filter(v => v.status === 'stopped').length || 0;
  const offlineVehicles = vehicles?.filter(v => v.status === 'offline').length || 0;

  // Calculate map region to show all vehicles
  const getMapRegion = () => {
    if (!locations || locations.length === 0) {
      return {
        latitude: 40.7580,
        longitude: -73.9855,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = locations.map(l => parseFloat(l.latitude));
    const lngs = locations.map(l => parseFloat(l.longitude));
    
    return {
      latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
      longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Ionicons name="car-sport" size={32} color="#10b981" />
            <Text variant="headlineMedium" style={styles.statNumber}>{activeVehicles}</Text>
            <Text variant="bodyMedium" style={styles.statLabel}>Active</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Ionicons name="pause-circle" size={32} color="#f59e0b" />
            <Text variant="headlineMedium" style={styles.statNumber}>{stoppedVehicles}</Text>
            <Text variant="bodyMedium" style={styles.statLabel}>Stopped</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
            <Text variant="headlineMedium" style={styles.statNumber}>{offlineVehicles}</Text>
            <Text variant="bodyMedium" style={styles.statLabel}>Offline</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.mapCard}>
        <Card.Content style={styles.mapContent}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={getMapRegion()}
            showsUserLocation
            showsMyLocationButton
          >
            {locations?.map((location) => {
              const vehicle = vehicles?.find(v => v.id === location.vehicleId);
              return (
                <Marker
                  key={location.id}
                  coordinate={{
                    latitude: parseFloat(location.latitude),
                    longitude: parseFloat(location.longitude),
                  }}
                  title={vehicle?.name || 'Unknown Vehicle'}
                  description={`Speed: ${location.speed ? parseFloat(location.speed).toFixed(1) : '0'} km/h`}
                  pinColor={vehicle?.iconColor || '#2563eb'}
                />
              );
            })}
          </MapView>
        </Card.Content>
      </Card>

      <Card style={styles.vehicleListCard}>
        <Card.Title title="Fleet Overview" />
        <Card.Content>
          {vehicles?.map((vehicle) => {
            const location = locations?.find(l => l.vehicleId === vehicle.id);
            return (
              <View key={vehicle.id} style={styles.vehicleItem}>
                <View style={styles.vehicleInfo}>
                  <View style={[styles.statusDot, { backgroundColor: 
                    vehicle.status === 'active' ? '#10b981' : 
                    vehicle.status === 'stopped' ? '#f59e0b' : '#ef4444'
                  }]} />
                  <Text variant="bodyLarge">{vehicle.name}</Text>
                </View>
                <Text variant="bodySmall" style={styles.vehicleSpeed}>
                  {location?.speed ? `${parseFloat(location.speed).toFixed(1)} km/h` : 'N/A'}
                </Text>
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  mapCard: {
    margin: 12,
    marginTop: 0,
  },
  mapContent: {
    padding: 0,
    height: 300,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  vehicleListCard: {
    margin: 12,
    marginTop: 0,
    marginBottom: 24,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  vehicleSpeed: {
    color: '#666',
  },
});
