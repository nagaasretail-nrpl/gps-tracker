# Assets Directory

This directory should contain the following assets for the mobile app:

## Required Assets

### App Icon (`icon.png`)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Purpose: Main app icon displayed on device home screen

### Splash Screen (`splash.png`)
- Size: 1242x2436 pixels (recommended)
- Format: PNG
- Purpose: Loading screen shown when app launches

### Adaptive Icon (`adaptive-icon.png`)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Purpose: Android adaptive icon (must have safe zone for different shapes)

### Favicon (`favicon.png`)
- Size: 48x48 pixels or higher
- Format: PNG
- Purpose: Web version icon

## Generating Assets

You can generate these assets using:

1. **Online Tools:**
   - [Icon Kitchen](https://icon.kitchen/) - Generate all required formats
   - [App Icon Generator](https://appicon.co/) - Create app icons

2. **Expo Asset Generator:**
   ```bash
   npx expo-asset-generator --input your-logo.png
   ```

3. **Manual Creation:**
   - Use design tools like Figma, Photoshop, or GIMP
   - Export at required sizes
   - Ensure transparent backgrounds for icons

## Temporary Placeholders

For development, you can use placeholder images:
- Simple solid color squares
- Generic GPS/map icons from free icon sites

Once you have proper assets, place them in this directory and they'll be automatically included in your builds.
