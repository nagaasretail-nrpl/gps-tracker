import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Divider, Switch } from 'react-native-paper';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

export default function MoreScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const navigation = useNavigation();

  const handleGeofences = () => {
    Alert.alert('Geofences', 'Geofence management coming soon');
  };

  const handleRoutes = () => {
    Alert.alert('Routes', 'Route management coming soon');
  };

  const handlePOIs = () => {
    Alert.alert('POIs', 'Points of Interest management coming soon');
  };

  const handleReports = () => {
    Alert.alert('Reports', 'Reports and analytics coming soon');
  };

  const handleVehicles = () => {
    Alert.alert('Vehicles', 'Vehicle management coming soon');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'App settings coming soon');
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Fleet Management</List.Subheader>
        
        <List.Item
          title="Vehicles"
          description="Manage your fleet"
          left={props => <List.Icon {...props} icon="car-multiple" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleVehicles}
        />

        <List.Item
          title="Geofences"
          description="Virtual boundaries and alerts"
          left={props => <List.Icon {...props} icon="map-marker-radius" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleGeofences}
        />

        <List.Item
          title="Routes"
          description="Predefined paths and zones"
          left={props => <List.Icon {...props} icon="routes" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleRoutes}
        />

        <List.Item
          title="Points of Interest"
          description="Important locations"
          left={props => <List.Icon {...props} icon="map-marker-star" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handlePOIs}
        />

        <Divider />

        <List.Subheader>Reports & Analytics</List.Subheader>

        <List.Item
          title="Trip Reports"
          description="View detailed trip data"
          left={props => <List.Icon {...props} icon="chart-line" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleReports}
        />

        <Divider />

        <List.Subheader>Preferences</List.Subheader>

        <List.Item
          title="Notifications"
          description="Push notifications for alerts"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          )}
        />

        <List.Item
          title="Dark Mode"
          description="Use dark color scheme"
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
            />
          )}
        />

        <List.Item
          title="Settings"
          description="App configuration"
          left={props => <List.Icon {...props} icon="cog" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleSettings}
        />

        <Divider />

        <List.Item
          title="About"
          description="App version and info"
          left={props => <List.Icon {...props} icon="information" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('GPS Tracker', 'Version 1.0.0')}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
