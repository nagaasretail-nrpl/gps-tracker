# GeoTracker-Inspired Design System

## Overview

This design system is inspired by GeoTracker, a clean and modern personal GPS tracking app. It emphasizes simplicity, readability, and efficient use of space for data-dense interfaces.

## Design Philosophy

1. **Clean & Minimal** - No unnecessary decoration, focus on data
2. **Information Hierarchy** - Clear visual hierarchy for statistics and controls
3. **Functional First** - Every element serves a purpose
4. **Mobile-Optimized** - Touch-friendly targets, readable at all sizes
5. **Data-Dense** - Show lots of information without overwhelming users

## Color Palette

### Primary Colors (Accent)
Based on GeoTracker's orange/red accent for active states and important actions:

```javascript
{
  primary: '#FF6B35',        // Vibrant orange-red (active tracking, primary buttons)
  primaryDark: '#E55A2B',    // Darker shade for press states
  primaryLight: '#FF8A5C',   // Lighter shade for backgrounds
}
```

### Track/Route Colors
For displaying different types of activities on the map:

```javascript
{
  trackWalking: '#FF6B35',    // Orange-red
  trackRunning: '#00B4D8',    // Bright blue
  trackCycling: '#4CAF50',    // Green
  trackDriving: '#9C27B0',    // Purple
  trackDefault: '#FF6B35',    // Default orange
}
```

### Background Colors

```javascript
{
  background: '#FFFFFF',          // Pure white
  backgroundSecondary: '#F5F5F5', // Light gray for cards/sections
  backgroundTertiary: '#EEEEEE',  // Slightly darker for nested elements
  backgroundDark: '#1A1A1A',      // Dark mode background
}
```

### Text Colors

```javascript
{
  textPrimary: '#212121',      // Almost black, high contrast
  textSecondary: '#757575',    // Medium gray for labels/secondary info
  textTertiary: '#9E9E9E',     // Light gray for tertiary info
  textOnPrimary: '#FFFFFF',    // White text on colored backgrounds
}
```

### Status Colors

```javascript
{
  success: '#4CAF50',    // Green (recording active)
  warning: '#FFC107',    // Amber (warnings)
  error: '#F44336',      // Red (errors, stop action)
  info: '#2196F3',       // Blue (information)
}
```

### Border/Divider Colors

```javascript
{
  border: '#E0E0E0',           // Light gray borders
  borderDark: '#BDBDBD',       // Slightly darker for emphasis
  divider: '#F0F0F0',          // Very subtle dividers
}
```

## Typography

### Font Family
- **Primary**: System default (San Francisco on iOS, Roboto on Android)
- React Native Paper uses native fonts automatically

### Font Sizes

```javascript
{
  // Headlines
  h1: 32,  // Screen titles
  h2: 24,  // Section headers
  h3: 20,  // Card titles
  h4: 18,  // Subsection headers
  
  // Body text
  bodyLarge: 16,   // Primary content
  bodyMedium: 14,  // Standard content
  bodySmall: 12,   // Supporting text
  
  // Labels & Captions
  label: 13,        // Input labels, button text
  caption: 11,      // Timestamps, small info
  overline: 10,     // Uppercase labels
  
  // Statistics (larger for quick scanning)
  statLarge: 48,    // Primary metric (e.g., distance)
  statMedium: 28,   // Secondary metrics
  statSmall: 16,    // Tertiary metrics
}
```

### Font Weights

```javascript
{
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
}
```

## Component Styling

### Buttons

**Primary Action Button** (Start/Stop Recording)
- Large, circular FAB (Floating Action Button)
- Size: 64x64dp minimum
- Background: `primary` color
- Icon: Play/Stop icon, white
- Elevation: 4dp
- Position: Bottom center of map screen

**Secondary Buttons**
- Height: 48dp
- Padding: 16dp horizontal
- Border Radius: 8dp
- Background: `primary` or transparent with border
- Text: medium weight, 14-16pt

**Icon Buttons**
- Size: 40x40dp touch target
- Icon: 24x24dp
- No background by default
- Color: `textSecondary`

### Cards

**Activity Card** (in history list)
```javascript
{
  backgroundColor: backgroundSecondary,
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  elevation: 1, // subtle shadow
}
```

**Stat Card** (showing metrics)
```javascript
{
  backgroundColor: background,
  borderRadius: 8,
  padding: 12,
  border: `1px solid ${border}`,
}
```

### Statistics Display

**Layout Pattern:**
```
┌─────────────────────────────────┐
│  DISTANCE             ↗ 425 m   │  Primary stat + icon
│  12.45 km                        │  Large number
├─────────────────────────────────┤
│  Duration │ Avg Speed │ Max Spd │  Secondary stats (3 columns)
│  1:23:45  │  8.5 km/h │ 15.2    │  Medium numbers
└─────────────────────────────────┘
```

**Stat Component:**
- Label: `caption` size, `textSecondary` color, uppercase
- Value: `statMedium` or `statLarge`, `textPrimary`, bold
- Unit: `bodySmall`, `textSecondary`, regular weight
- Icon (optional): 20x20dp, `primary` color

### Maps

**Map Style:**
- Default: OSM-style street map
- Satellite: Available as option
- Dark mode: Dark gray base with muted colors

**Track Line:**
- Width: 4-5px
- Color: Based on activity type (see Track Colors)
- Line cap: Round
- Line join: Round

**Markers:**
- Start: Green circle (16dp) with white border (2dp)
- End: Red circle (16dp) with white border (2dp)
- Current position: Blue pulsing circle (20dp)
- POI: Colored marker with icon

**Map Controls:**
- Position: Bottom right
- Buttons: 40x40dp
- Background: White with shadow
- Icons: 20x20dp, gray

### Lists

**Activity List Item:**
```
┌────────────────────────────────────────┐
│ [Icon] Running                 2h ago  │  Type + timestamp
│        Downtown Loop                   │  Name
│        12.5 km · 1:23:45 · ↗ 245m     │  Key stats
└────────────────────────────────────────┘
```

Height: 80dp minimum
Padding: 16dp
Divider: 1px, `divider` color
Icon: 40x40dp, colored circle with activity icon

### Bottom Sheets / Modals

**Bottom Sheet** (for activity details)
- Corner radius: 16dp (top corners only)
- Background: `background`
- Handle: 32dp wide, 4dp height, centered, `borderDark` color
- Padding: 24dp
- Max height: 90% of screen

**Modal**
- Background overlay: black, 40% opacity
- Modal background: `background`
- Border radius: 12dp
- Padding: 24dp
- Max width: 400dp (on tablets)

### Forms / Inputs

**Text Input:**
- Height: 48dp
- Padding: 12dp horizontal
- Border: 1px, `border` color
- Border radius: 8dp
- Focus border: 2px, `primary` color
- Font size: 16dp (prevents zoom on iOS)

**Select / Picker:**
- Same styling as text input
- Dropdown icon: 16x16dp, `textSecondary`

**Checkbox / Radio:**
- Size: 24x24dp
- Active color: `primary`
- Inactive: `border` color

## Spacing System

Use 4dp base unit for consistent spacing:

```javascript
{
  xs: 4,    // Tight spacing (between related items)
  sm: 8,    // Small spacing (within components)
  md: 16,   // Medium spacing (between components)
  lg: 24,   // Large spacing (between sections)
  xl: 32,   // Extra large spacing (major sections)
  xxl: 48,  // Screen padding
}
```

## Icons

**Icon Library:** Use Material Design icons or similar
- Navigation icons: 24x24dp
- Action icons: 24x24dp
- Small icons: 16x16dp (in text/chips)
- Large icons: 48x48dp (empty states)

**Activity Type Icons:**
- Walking: Person walking
- Running: Person running
- Cycling: Bicycle
- Driving: Car
- Hiking: Mountain/trail

## Screen Layouts

### Navigation Pattern

**Bottom Tabs** (Main navigation)
- Height: 56dp
- Icons: 24x24dp
- Labels: 12dp
- Active color: `primary`
- Inactive color: `textSecondary`

**Tabs:**
1. Activities (Personal tracking)
2. Map (Live tracking)
3. Fleet (Vehicle management)
4. More (Settings)

### Header Pattern

**App Bar:**
- Height: 56dp
- Background: `background`
- Title: 20dp, medium weight
- Icons: 24x24dp
- Elevation: 2dp (or use border)

## Animations

### Duration
- Fast: 150ms (state changes, simple transitions)
- Normal: 250ms (screen transitions, cards)
- Slow: 400ms (complex animations, modals)

### Easing
- Standard: easeInOut (most transitions)
- Entrance: easeOut (elements appearing)
- Exit: easeIn (elements disappearing)

### Specific Animations
- **Recording pulsing indicator**: 1000ms, linear, infinite
- **Map zoom**: 300ms, easeInOut
- **List item appearance**: Fade + slide up, 250ms
- **Bottom sheet**: Slide up, 300ms, easeOut

## Accessibility

### Touch Targets
- Minimum: 44x44dp (iOS) / 48x48dp (Android)
- Preferred: 48x48dp for all platforms

### Contrast Ratios
- Normal text: 4.5:1 minimum
- Large text (18dp+): 3:1 minimum
- Interactive elements: 3:1 minimum

### Text Scaling
- Support dynamic type/font scaling
- Test at 200% scale
- Don't let critical buttons scale beyond touch target size

## Dark Mode

When implementing dark mode:

```javascript
{
  background: '#1A1A1A',          // Dark gray (not pure black)
  backgroundSecondary: '#2C2C2C', // Slightly lighter
  backgroundTertiary: '#3A3A3A',  // Even lighter
  
  textPrimary: '#FFFFFF',         // Pure white
  textSecondary: '#B3B3B3',       // Medium gray
  textTertiary: '#808080',        // Darker gray
  
  border: '#404040',              // Subtle borders
  
  // Keep accent colors mostly the same
  primary: '#FF7B51',             // Slightly lighter orange
}
```

## Implementation with React Native Paper

React Native Paper provides pre-built components that align with Material Design. Configure the theme:

```javascript
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    secondary: '#00B4D8',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    error: '#F44336',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FF7B51',
    secondary: '#00B4D8',
    background: '#1A1A1A',
    surface: '#2C2C2C',
    error: '#F44336',
  },
};
```

## Examples

### Activity Recording Screen
- **Top**: Transparent overlay with elapsed time, current stats
- **Center**: Full-screen map with current route
- **Bottom**: Large circular FAB (Start/Pause/Stop)
- **Bottom sheet** (swipe up): Detailed statistics

### Activity History Screen
- **Top**: Search bar + filter chips
- **Center**: List of activity cards
- **Card**: Icon, name, date, key stats (distance, duration, elevation)
- **Tap card**: Navigate to detail screen

### Activity Detail Screen
- **Top**: Activity name, type, date
- **Map section**: Route visualization (300dp height)
- **Stats grid**: Distance, duration, speed, elevation (2x2 grid)
- **Charts**: Speed/elevation charts
- **Bottom**: Share/Export/Delete buttons

### Fleet Dashboard
- **Top**: Fleet statistics cards (3 across)
- **Center**: Map with all vehicles
- **Bottom sheet**: Vehicle list with live status

## Key Differences from Generic GPS App

1. **Statistics-first**: GeoTracker emphasizes data, not social features
2. **Minimal UI**: No gradients, no fancy backgrounds, just data and maps
3. **Functional colors**: Colors indicate type/status, not just decoration
4. **Dense information**: Pack more stats in less space
5. **Quick access**: Everything important is 1-2 taps away

## Resources

- GeoTracker screenshots: See Play Store listing
- Material Design 3: https://m3.material.io/
- React Native Paper: https://callstack.github.io/react-native-paper/
- React Native Maps: https://github.com/react-native-maps/react-native-maps
