# GPS Tracking Application

## Overview

This is a real-time GPS tracking and fleet management application built with a React frontend and Express backend. The application provides comprehensive vehicle tracking capabilities including live location monitoring, historical route playback, geofencing, points of interest management, and reporting features. The system is designed with a map-centric interface following Material Design 3 principles for utility-focused enterprise tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management with caching and automatic refetching

**UI Framework:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Inter font family for consistent typography
- Material Design 3 dashboard variant as the design foundation

**State Management:**
- React Query handles all server state with configurable refetch intervals (10s for real-time tracking)
- Local component state for UI interactions
- Theme context for light/dark mode management

**Map Integration:**
- Leaflet.js for interactive map rendering
- OpenStreetMap tiles as the base layer
- Custom markers, polylines, and geofence overlays
- Real-time vehicle position updates via WebSocket connections

**Page Structure:**
- Dashboard: Overview with fleet statistics and live vehicle map
- Real-time Tracking: Live vehicle monitoring with vehicle list sidebar
- History: Historical route playback with timeline controls
- Geofences: Virtual boundary creation and management
- Routes: Predefined route planning and visualization
- POIs: Points of interest management (parking, fuel stations, warehouses)
- Reports: Trip analytics with charts and data tables
- Vehicles: Fleet management and vehicle configuration

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- HTTP REST API for CRUD operations
- WebSocket server (ws library) for real-time location streaming
- Drizzle ORM for database interactions

**API Design:**
- RESTful endpoints following resource-based patterns
- Zod schema validation for request/response data
- Consistent error handling with appropriate HTTP status codes
- Request logging middleware with response capture

**Data Models:**
- Vehicles: Fleet inventory with device IDs and status tracking
- Locations: GPS coordinates with timestamps, speed, heading, altitude
- Geofences: Polygon/circle boundaries with entry/exit alerts
- Routes: Predefined paths with coordinate arrays
- POIs: Categorized landmarks with descriptions
- Events: System events and alerts
- Trips: Aggregated journey data for reporting

**Real-time Updates:**
- WebSocket connections for live location broadcasting
- 10-second polling fallback via HTTP endpoints
- Vehicle status updates (active/stopped/offline)

### Data Storage

**Database:**
- PostgreSQL via Neon serverless database
- Drizzle ORM with schema-first approach
- UUID primary keys generated via `gen_random_uuid()`
- Timestamps for all records using `defaultNow()`

**Schema Design:**
- Decimal precision for geographic coordinates (10,7) and measurements
- JSONB columns for flexible coordinate arrays in geofences/routes
- Text fields for addresses resolved via reverse geocoding
- Indexed foreign keys for efficient vehicle-location queries

**Migration Strategy:**
- Drizzle Kit for schema migrations in `/migrations` directory
- `db:push` command for development schema synchronization

### Styling and Theming

**Design System:**
- CSS custom properties for theme variables (light/dark modes)
- HSL color space for programmatic color manipulation
- Elevation system using layered shadows (`--elevate-1`, `--elevate-2`)
- Border utilities with opacity-based outlines

**Responsive Design:**
- Mobile-first breakpoints (768px tablet, 1024px desktop)
- Collapsible sidebar navigation on mobile devices
- Full-width maps with overlay panels
- Touch-optimized controls for map interactions

**Component Variants:**
- Button variants: default, destructive, outline, secondary, ghost
- Badge variants for status indicators
- Card components with consistent padding and borders
- Form controls with validation states

## External Dependencies

### Third-Party Services

**Mapping:**
- Leaflet 1.9.4 - Open-source map library loaded via CDN
- OpenStreetMap - Tile provider for base map layers
- Potential integration point for reverse geocoding services (address resolution)

**Fonts:**
- Google Fonts CDN - Inter font family (weights 300-700)

### NPM Packages

**UI Components:**
- @radix-ui/* - Headless UI primitives (20+ component packages)
- shadcn/ui - Pre-configured Radix components with Tailwind styling
- lucide-react - Icon library
- recharts - Chart components for reports
- embla-carousel-react - Carousel functionality

**Forms and Validation:**
- react-hook-form - Form state management
- @hookform/resolvers - Form validation resolver
- zod - Runtime type validation
- drizzle-zod - Drizzle schema to Zod conversion

**Data Fetching:**
- @tanstack/react-query - Server state management
- ws - WebSocket server implementation

**Database:**
- @neondatabase/serverless - Neon Postgres client
- drizzle-orm - TypeScript ORM
- drizzle-kit - Migration tooling
- connect-pg-simple - PostgreSQL session store (available but not actively used)

**Development Tools:**
- @replit/vite-plugin-* - Replit-specific development plugins
- tsx - TypeScript execution
- esbuild - Production build bundler

### Potential Future Integrations

- GPS device communication protocols (not yet implemented)
- Reverse geocoding API for address resolution
- SMS/email notification services for geofence alerts
- Export functionality for reports (PDF/Excel generation)
- Advanced analytics and route optimization algorithms