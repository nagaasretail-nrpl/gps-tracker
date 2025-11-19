import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Button, Text, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';

export default function HistoryScreen() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24 hours ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', 'history', selectedVehicleId, startDate, endDate],
    queryFn: () => api.getLocations({
      vehicleId: selectedVehicleId || undefined,
      startDate,
      endDate,
    }),
    enabled: !!selectedVehicleId,
  });

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  const routeCoordinates = locations?.map(loc => ({
    latitude: parseFloat(loc.latitude),
    longitude: parseFloat(loc.longitude),
  })) || [];

  const mapRegion = routeCoordinates.length > 0
    ? {
        latitude: routeCoordinates[0].latitude,
        longitude: routeCoordinates[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 40.7580,
        longitude: -73.9855,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <Card style={styles.controlCard}>
        <Card.Content>
          <Menu
            visible={showVehicleMenu}
            onDismiss={() => setShowVehicleMenu(false)}
            anchor={
              <Button mode="outlined" onPress={() => setShowVehicleMenu(true)}>
                {selectedVehicle?.name || 'Select Vehicle'}
              </Button>
            }
          >
            {vehicles?.map((vehicle) => (
              <Menu.Item
                key={vehicle.id}
                onPress={() => {
                  setSelectedVehicleId(vehicle.id);
                  setShowVehicleMenu(false);
                }}
                title={vehicle.name}
              />
            ))}
          </Menu>

          <Divider style={styles.divider} />

          <View style={styles.dateControls}>
            <View style={styles.dateControl}>
              <Text variant="labelMedium">Start Date</Text>
              <Button mode="outlined" onPress={() => setShowStartPicker(true)}>
                {startDate.toLocaleDateString()}
              </Button>
            </View>

            <View style={styles.dateControl}>
              <Text variant="labelMedium">End Date</Text>
              <Button mode="outlined" onPress={() => setShowEndPicker(true)}>
                {endDate.toLocaleDateString()}
              </Button>
            </View>
          </View>

          {locations && locations.length > 0 && (
            <View style={styles.stats}>
              <Text variant="bodyMedium">
                Total Points: {locations.length}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
        >
          {routeCoordinates.length > 0 && (
            <>
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#2563eb"
                strokeWidth={3}
              />
              <Marker
                coordinate={routeCoordinates[0]}
                title="Start"
                pinColor="green"
              />
              <Marker
                coordinate={routeCoordinates[routeCoordinates.length - 1]}
                title="End"
                pinColor="red"
              />
            </>
          )}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlCard: {
    margin: 12,
    zIndex: 1000,
  },
  divider: {
    marginVertical: 12,
  },
  dateControls: {
    flexDirection: 'row',
    gap: 12,
  },
  dateControl: {
    flex: 1,
    gap: 4,
  },
  stats: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
});
