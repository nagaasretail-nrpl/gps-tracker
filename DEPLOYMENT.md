# Deployment Guide - Backend + React Native Mobile App

This project contains **two separate applications**:
1. **Backend API** (Express.js) - Deploys on Replit
2. **Mobile App** (React Native) - Runs locally/deploys separately

## Package.json Files

The project has **two package.json files**:

### `package.json` (Current)
- **Purpose:** Backend Express server dependencies
- **Used by:** Replit for deployment
- **Includes:** Express, Drizzle ORM, WebSocket, database drivers
- **Deployment:** Works on Replit

### `package-mobile.json`
- **Purpose:** React Native mobile app dependencies  
- **Used by:** Local development of mobile app
- **Includes:** Expo, React Native, React Native Maps, React Native Paper
- **Deployment:** Cannot deploy on Replit (needs native tools)

## How Deployment Works on Replit

### Backend Deployment (Automatic)

Replit will automatically deploy the **Express backend only**:

```bash
# Build command
npm run build

# Run command  
npm run start
```

This deploys:
- Express API server on port 5000
- PostgreSQL database
- WebSocket server
- Geofence detection system
- All API endpoints

### What Gets Deployed

✅ **Deployed:**
- `server/` directory (Express backend)
- `shared/` directory (TypeScript types)
- Backend dependencies from `package.json`

❌ **NOT Deployed (Ignored):**
- `App.tsx` (React Native app entry)
- `src/screens/` (Mobile screens)
- `app.json` (Expo configuration)
- React Native dependencies
- Mobile app files

## Running Locally

### Backend Only (Replit or Local)

```bash
# Uses package.json (backend dependencies)
npm install
npm run dev
```

### Mobile App (Local Only)

```bash
# Step 1: Switch to mobile dependencies
cp package-mobile.json package.json

# Step 2: Install
npm install

# Step 3: Start Expo
npm start

# Step 4: When done, restore backend package.json
cp package-web.json.backup package.json
```

**OR use a separate directory** for mobile development to avoid switching package.json files.

## Recommended Setup for Local Development

### Option 1: Two Separate Projects (Recommended)

```
gps-tracker-backend/      # Backend only
├── package.json         # Backend dependencies
├── server/
├── shared/
└── ...

gps-tracker-mobile/       # Mobile only  
├── package.json         # Mobile dependencies (from package-mobile.json)
├── App.tsx
├── src/
├── shared/              # Symlink or copy from backend
└── ...
```

### Option 2: Single Project with Package Switching

Keep current structure and swap package.json as needed:
- **For backend:** Use `package.json` (current)
- **For mobile:** Copy `package-mobile.json` to `package.json`

## Deployment Checklist

### ✅ Backend (Replit)

1. Ensure `package.json` is the backend version (not mobile)
2. Set environment variables:
   ```
   DATABASE_URL=your-postgres-url
   SESSION_SECRET=your-secret
   ```
3. Run `npm run db:push` to sync database schema
4. Deploy using Replit's deployment button
5. Backend will be available at: `https://your-repl.replit.app`

### ✅ Mobile App (Expo EAS)

1. Copy `package-mobile.json` to `package.json`
2. Update `src/services/api.ts` with production API URL:
   ```typescript
   const API_BASE_URL = 'https://your-repl.replit.app/api';
   ```
3. Build with Expo:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```
4. Submit to app stores:
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

## Environment Variables

### Backend (Replit Secrets)
```
DATABASE_URL=postgresql://...
SESSION_SECRET=random-secret-string
PORT=5000
```

### Mobile App (.env file)
```
API_URL=https://your-repl.replit.app/api
WS_URL=wss://your-repl.replit.app/ws
```

## Troubleshooting

### "React version conflict" error

**Cause:** Using `package-mobile.json` when deploying on Replit

**Fix:**
```bash
cp package-web.json.backup package.json
```

### "Cannot find module 'expo'"

**Cause:** Using backend `package.json` when running mobile app

**Fix:**  
```bash
cp package-mobile.json package.json
npm install
```

### Mobile app can't connect to backend

**Cause:** Using `localhost` in API URL

**Fix:** Use your computer's local IP or deployed Replit URL:
```typescript
// Development (local backend)
const API_BASE_URL = 'http://192.168.1.100:5000/api';

// Production (deployed backend)
const API_BASE_URL = 'https://your-repl.replit.app/api';
```

## Summary

- **Replit deploys:** Backend only (Express API)
- **Local development:** Mobile app (React Native)
- **Two package.json files:** Backend vs Mobile dependencies
- **Keep them separate:** Don't mix React Native and backend in same deployment

For questions, see:
- `README.md` - Project overview
- `REACT_NATIVE_SETUP.md` - Mobile app setup
- `replit.md` - Architecture documentation
