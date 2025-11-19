# GPS Tracking Application Design Guidelines

## Design Approach

**Selected Framework:** Material Design 3 (Dashboard variant)
**Justification:** Utility-focused application requiring clear information hierarchy, data visualization excellence, and proven interaction patterns for complex enterprise tools. Material Design provides robust components for maps, tables, and real-time data displays.

**Core Principles:**
- Map-centric design with data supporting the visual tracking experience
- Immediate information accessibility - critical data within one click
- Persistent navigation for rapid feature switching
- Clear visual hierarchy distinguishing live data from historical reports

## Typography System

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter for all interface text (excellent readability at small sizes for data tables)

**Type Scale:**
- Page Headers: text-2xl font-semibold (Dashboard, Reports, Vehicles)
- Section Headers: text-lg font-medium (Widget titles, table headers)
- Body Text: text-sm font-normal (Table data, form labels, descriptions)
- Data Display: text-base font-medium (Live coordinates, speed, status)
- Micro Text: text-xs font-normal (Timestamps, metadata, helper text)
- Map Labels: text-sm font-semibold (POI markers, geofence names)

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section margins: mb-6, mb-8
- Grid gaps: gap-4, gap-6
- Card spacing: p-6
- Dense data tables: p-2, py-3

**Grid Structure:**
- Dashboard: 3-column layout (sidebar 256px, map flex-1, info panel 320px)
- Mobile: Single column stack (map full-width, collapsible panels)
- Data tables: Full-width with responsive horizontal scroll
- Report grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Component Library

### Navigation
**Sidebar Navigation (Persistent Left)**
- Fixed width sidebar (w-64)
- Logo/branding at top (h-16)
- Icon + label navigation items with hover states
- Active state indicator (border-l-4)
- Collapsible on mobile (hamburger menu)
- Sections: Dashboard, Real-time Tracking, History, Geofences, Routes, POI, Reports, Vehicles, Settings

**Top Bar**
- User profile dropdown (right)
- Notification bell icon with badge count
- Quick vehicle selector dropdown
- Live connection status indicator (green dot + text)

### Map Interface
**Central Map Component**
- Full height minus header (h-[calc(100vh-4rem)])
- Vehicle markers with directional icons showing heading
- Click markers to open info popups with: vehicle name, speed, address, last update time
- Zoom controls (bottom-right)
- Layer toggle (satellite/road view)
- Geofence overlays with semi-transparent fills
- Route paths as polylines

### Data Widgets
**Live Status Cards**
- Compact cards (min-h-32) in grid layout
- Icon + metric + label format
- Examples: Total Vehicles, Active, Stopped, Offline
- Large number display (text-3xl font-bold) with small label below

**Vehicle List Panel (Right Sidebar)**
- Scrollable list of all vehicles
- Each item shows: name, status badge, speed, last update
- Search/filter input at top
- Grouped by status (Active, Stopped, Offline)

**Real-time Data Table**
- Sticky header row
- Columns: Vehicle, Status, Speed, Location, Last Update, Actions
- Alternating row backgrounds for readability
- Status badges (rounded-full px-3 py-1 text-xs)
- Action buttons (icon only, minimal)

### Forms & Inputs
**Standard Form Elements**
- Text inputs: border rounded px-4 py-2
- Labels above inputs: text-sm font-medium mb-2
- Dropdowns: Native select styled consistently
- Date/time pickers for history queries
- Geofence polygon drawing tools with vertex editing

**Buttons**
- Primary actions: px-6 py-2.5 rounded font-medium
- Secondary actions: px-4 py-2 rounded border
- Icon buttons: p-2 rounded-lg (map controls)
- Blurred backgrounds when over map imagery

### Data Visualization
**Route Playback**
- Timeline scrubber below map
- Play/pause controls
- Speed multiplier selector (1x, 2x, 5x, 10x)
- Timestamp display showing current point

**Reports**
- Summary cards at top showing totals
- Detailed tables below with sorting
- Export buttons (CSV, PDF) - top-right
- Date range picker - top-left
- Charts for mileage/fuel graphs using simple bar/line visuals

**Geofence Builder**
- Drawing tools: polygon, circle, rectangle
- Edit mode with vertex dragging
- Name and description fields in side panel
- Alert configuration toggles (enter/exit notifications)

### Modal Dialogs
- Add/edit vehicle forms
- POI creation (name, description, coordinates)
- Event notification settings
- Centered overlay with backdrop blur
- Max width: max-w-2xl
- Close button (top-right)

## Images

**No Large Hero Images**
This is a dashboard application focused on functionality. The map serves as the primary visual element.

**Icon Usage:**
- Material Icons CDN for all UI icons
- Vehicle markers: Custom vehicle silhouettes showing direction
- Status indicators: Simple colored dots
- POI markers: Pin icons with customizable symbols

**Map Backgrounds:**
- OpenStreetMap or Google Maps integration
- Default to road view with satellite toggle option

## Special Considerations

**Real-time Updates:**
- Live data refreshes every 10 seconds
- Subtle pulse animation on updating markers
- Timestamp display showing "2s ago", "1m ago" format

**Responsive Behavior:**
- Desktop: Three-panel layout (sidebar + map + info)
- Tablet: Map full-width, collapsible sidebars
- Mobile: Stack vertically, bottom sheet for vehicle list

**Performance:**
- Virtual scrolling for large vehicle lists (100+ items)
- Map marker clustering when zoomed out
- Lazy loading for historical route data

**Accessibility:**
- All map interactions keyboard accessible
- ARIA labels on all icon buttons
- Focus indicators on interactive elements
- Alt text for status indicators