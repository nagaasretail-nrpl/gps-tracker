import { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, List, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { api } from '../services/api';

export default function TrackingScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: locations, isLoading: loadingLocations } = useQuery({
    queryKey: ['locations', 'latest'],
    queryFn: () => api.getLatestLocations(),
    refetchInterval: 10000,
  });

  if (loadingVehicles || loadingLocations) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const filteredVehicles = vehicles?.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLocation = selectedVehicleId
    ? locations?.find(l => l.vehicleId === selectedVehicleId)
    : null;

  const mapRegion = selectedLocation
    ? {
        latitude: parseFloat(selectedLocation.latitude),
        longitude: parseFloat(selectedLocation.longitude),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 40.7580,
        longitude: -73.9855,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation
      >
        {locations?.map((location) => {
          const vehicle = vehicles?.find(v => v.id === location.vehicleId);
          const isSelected = location.vehicleId === selectedVehicleId;
          return (
            <Marker
              key={location.id}
              coordinate={{
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude),
              }}
              title={vehicle?.name || 'Unknown Vehicle'}
              description={`Speed: ${location.speed ? parseFloat(location.speed).toFixed(1) : '0'} km/h`}
              pinColor={isSelected ? '#2563eb' : vehicle?.iconColor || '#10b981'}
            />
          );
        })}
      </MapView>

      <View style={styles.vehicleListContainer}>
        <Searchbar
          placeholder="Search vehicles..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <FlatList
          data={filteredVehicles}
          keyExtractor={(item) => item.id}
          renderItem={({ item: vehicle }) => {
            const location = locations?.find(l => l.vehicleId === vehicle.id);
            const isSelected = vehicle.id === selectedVehicleId;

            return (
              <List.Item
                title={vehicle.name}
                description={location?.address || 'Location unknown'}
                left={() => (
                  <View style={styles.listIcon}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: 
                        vehicle.status === 'active' ? '#10b981' :
                        vehicle.status === 'stopped' ? '#f59e0b' : '#ef4444'
                      }
                    ]} />
                  </View>
                )}
                right={() => (
                  <View style={styles.vehicleStats}>
                    <Chip mode="flat" style={styles.chip}>
                      {location?.speed ? `${parseFloat(location.speed).toFixed(1)} km/h` : 'N/A'}
                    </Chip>
                  </View>
                )}
                style={[styles.listItem, isSelected && styles.selectedListItem]}
                onPress={() => setSelectedVehicleId(vehicle.id)}
              />
            );
          }}
          style={styles.vehicleList}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  vehicleListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchBar: {
    margin: 12,
  },
  vehicleList: {
    maxHeight: 300,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedListItem: {
    backgroundColor: '#e0f2fe',
  },
  listIcon: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  vehicleStats: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  chip: {
    backgroundColor: '#f0f0f0',
  },
});
