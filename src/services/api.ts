import type { Vehicle, Location, Geofence, Route, Poi, Event, Trip, User } from '../../shared/schema';

// API base URL - configured for Replit backend
// This is your live Replit server URL
const API_BASE_URL = 'https://4869a092-e3cd-4bee-bb16-14d4f7e6f9b6-00-hyqpud9sy9dl.kirk.replit.dev/api';

// Authentication token storage (you'll need to implement AsyncStorage for production)
let authToken: string | null = null;

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for session authentication
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please login');
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed - check your credentials');
    }

    return await response.json();
  }

  async signup(email: string, password: string, name: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/auth/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    return await response.json();
  }

  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL.replace('/api', '')}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    authToken = null;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
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
