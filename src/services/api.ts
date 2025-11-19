import type { Vehicle, Location, Geofence, Route, Poi, Event, Trip } from '../../shared/schema';

// API base URL - update this for your environment
// For mobile development, use your computer's local IP address (e.g., 192.168.1.100)
// NOT localhost, as the mobile device runs in a separate network context
const API_BASE_URL = 'http://localhost:5000/api'; // Change to your local IP for mobile testing

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>('/vehicles');
  }

  async getVehicle(id: string): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${id}`);
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string): Promise<void> {
    return this.request<void>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  // Locations
  async getLocations(params?: {
    vehicleId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Location[]> {
    const searchParams = new URLSearchParams();
    if (params?.vehicleId) searchParams.append('vehicleId', params.vehicleId);
    if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
    if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
    
    const query = searchParams.toString();
    return this.request<Location[]>(`/locations${query ? `?${query}` : ''}`);
  }

  async getLatestLocations(): Promise<Location[]> {
    return this.request<Location[]>('/locations/latest');
  }

  async createLocation(data: Partial<Location>): Promise<Location> {
    return this.request<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Geofences
  async getGeofences(): Promise<Geofence[]> {
    return this.request<Geofence[]>('/geofences');
  }

  async createGeofence(data: Partial<Geofence>): Promise<Geofence> {
    return this.request<Geofence>('/geofences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGeofence(id: string, data: Partial<Geofence>): Promise<Geofence> {
    return this.request<Geofence>(`/geofences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGeofence(id: string): Promise<void> {
    return this.request<void>(`/geofences/${id}`, {
      method: 'DELETE',
    });
  }

  // Routes
  async getRoutes(): Promise<Route[]> {
    return this.request<Route[]>('/routes');
  }

  // POIs
  async getPois(): Promise<Poi[]> {
    return this.request<Poi[]>('/pois');
  }

  // Events
  async getEvents(params?: {
    vehicleId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Event[]> {
    const searchParams = new URLSearchParams();
    if (params?.vehicleId) searchParams.append('vehicleId', params.vehicleId);
    if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
    if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
    
    const query = searchParams.toString();
    return this.request<Event[]>(`/events${query ? `?${query}` : ''}`);
  }

  // Trips
  async getTrips(params?: {
    vehicleId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Trip[]> {
    const searchParams = new URLSearchParams();
    if (params?.vehicleId) searchParams.append('vehicleId', params.vehicleId);
    if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
    if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
    
    const query = searchParams.toString();
    return this.request<Trip[]>(`/trips${query ? `?${query}` : ''}`);
  }
}

export const api = new ApiService();
