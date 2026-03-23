# Location-Based Store Selection — Implementation Complete

## Overview

This document outlines the location-based store selection feature for CodePop's federated distributed system. Users are directed to a specific VM (store) based on their location preferences on first app open, with all subsequent API requests routed to that store's backend.

---

## Architecture

### Live Node IPs (GCP VMs)
| Node | URL |
|---|---|
| Logan Hub | `http://34.136.12.86:8000` |
| Logan Store 1 | `http://34.55.170.11:8000` |
| Logan Store 2 | `http://34.121.91.135:8000` |
| Atlanta Hub | `http://136.115.168.184:8000` |
| Atlanta Store 1 | `http://136.112.202.76:8000` |
| Atlanta Store 2 | `http://34.173.157.74:8000` |

### Data Persistence (AsyncStorage)
| Key | Type | Purpose |
|---|---|---|
| `locationPermission` | `'granted'` \| `'denied'` \| null | Track user's location consent |
| `selectedStoreEndpoint` | URL string | Store backend URL for all API calls |
| `selectedStoreId` | string | Unique store identifier |
| `selectedStoreName` | string | Display name (e.g., "CodePop Logan #1") |

---

## Implementation Details

### 1. Dynamic Base URL Module (`codepop/ip_address.js`)

**Exports:**
- `getBaseURL()` — synchronous getter, returns current store's API endpoint (cached)
- `initBaseURL()` — async, initializes cache from AsyncStorage on app startup
- `setBaseURL(url)` — setter, updates cache and persists to AsyncStorage
- `getPrimaryHubURL()` — returns Logan hub URL for store registry fetches
- `getFallbackHubURL()` — returns Atlanta hub URL (fallback)

**Behavior:**
- Defaults to Logan hub until user makes a selection
- On app startup, `initBaseURL()` restores saved endpoint
- All subsequent API calls use `getBaseURL()` instead of the old hardcoded `localhost:8000`

### 2. Store Selection Modal (`src/components/StoreSelectionModal.js`)

**Two-Phase Flow:**

**Phase 1: Location Permission (First Launch)**
- Logo, heading, description
- "Allow Location" button → GPS auto-select nearest store
- "Choose Manually" button → skip to Phase 2
- On success: saves selection, closes modal
- On permission denied: transitions to Phase 2

**Phase 2: Manual Store Selection**
- `react-native-maps` `MapView` with pins for all stores
  - Map centers on user location (if Phase 1 GPS succeeded), else US center
  - Tap pin to highlight and focus that store
- `FlatList` of stores sorted by region then distance
  - Distance calculated via haversine formula (~10 lines inline math)
  - Each card shows: store name, region, distance
- "Confirm" button saves selection and closes modal
- **No skip:** user must select a store to proceed

**Data Fetching:**
- `GET PRIMARY_HUB_URL/backend/api/hub/store-registry/`
- Returns: `{ stores: [{ store_id, store_name, region, api_endpoint, latitude, longitude }] }`
- Falls back to `FALLBACK_HUB_URL` if primary hub unreachable

### 3. Home Page Integration (`src/pages/GeneralHomePage.js`)

**On Mount:**
- Checks if `selectedStoreEndpoint` exists in AsyncStorage
- If missing (first launch): shows `StoreSelectionModal`
- After selection: displays banner "Shopping at [Store Name]"

**Modal Lifecycle:**
- `visible={showStoreModal}`, `onClose={handleStoreModalClose}`
- Re-reads store info from AsyncStorage after modal closes

### 4. Preferences Page (`src/pages/PreferencesPage.js`)

**Location & Delivery Tab:**
- Displays current store name (reads from AsyncStorage)
- "Use My Location" toggle switch
  - ON → re-run GPS auto-select flow
  - OFF → manual store selection only
- "Change Store" button → opens modal in Phase 2 (manual selection)

**On Tab Focus:**
- Loads current `locationPermission` and `selectedStoreName`
- Updates UI to reflect current selection

### 5. App Initialization (`App.js`)

**On Launch:**
- `useEffect` in `AppNavigator` calls `initBaseURL()` once
- Ensures `getBaseURL()` returns saved store endpoint before any screens render and make API calls

### 6. Global API Update

**All API-calling pages refactored:**
- `AuthPage`, `EmailCheckPage`, `CreateAccountPage`
- `GeneralHomePage`, `PreferencesPage`
- `CreateDrinkPage`, `CartPage`, `ComplaintsPage`
- `PaymentPage`, `CheckoutForm`, `PostCheckout`, `UpdateDrink`
- `AdminDash`, `ManagerDash`
- `SeasonalCarousel`, `RatingCarosel`, `AIAlert`

**Pattern:**
```js
// Before:
import { BASE_URL } from '../../ip_address';
const response = await fetch(`${BASE_URL}/backend/auth/login/`, ...);

// After:
import { getBaseURL } from '../../ip_address';
const response = await fetch(`${getBaseURL()}/backend/auth/login/`, ...);
```

---

## Tech Stack

**Libraries Used:**
- `expo-location` (v17.0.1) — GPS/permissions (already installed)
- `react-native-maps` (v1.14.0) — map display (already installed)
- `react-native-modal` (v13.0.1) — modal component (already installed)
- `@react-native-async-storage/async-storage` — session persistence (already installed)

**No new dependencies added.** Existing libraries were leveraged.

---

## Backend Integration

**No backend changes required.** The hub store registry endpoint already exists and is open (no auth):

```
GET /backend/api/hub/store-registry/
Response: {
  "stores": [
    {
      "store_id": 1,
      "store_name": "CodePop Logan #1",
      "region": "logan",
      "api_endpoint": "http://34.55.170.11:8000",
      "latitude": 40.7608,
      "longitude": -111.8910,
      "last_heartbeat": "2026-03-22T10:30:00Z"
    },
    ...
  ]
}
```

Each store VM runs the full Django auth stack. Auth endpoints (login, register, check-email) route to the selected store's VM automatically via `getBaseURL()`.

---

## Verification Checklist

### Basic Flow
- [ ] 1. Clear AsyncStorage (fresh install) → open app → location permission modal appears
- [ ] 2. Allow location → auto-selects nearest store → modal closes → home page shows store banner
- [ ] 3. Deny location → map + list appears → select store manually → modal closes

### Persistence
- [ ] 4. Navigate to Preferences → Location tab shows correct store name
- [ ] 5. Toggle "Use My Location" and "Change Store" work as expected
- [ ] 6. Kill app and reopen → previously selected store remembered

### Network Routing
- [ ] 7. Make an order → inspect network requests (Metro console) → confirm requests go to selected store IP, not localhost
- [ ] 8. Change store in Preferences → new requests route to new store's IP
- [ ] 9. Login/register → requests route to selected store (not Logan hub)

### Edge Cases
- [ ] 10. Hub unreachable → fallback to Atlanta hub works
- [ ] 11. GPS fails → gracefully transitions to manual selection
- [ ] 12. Permission denied initially → can toggle "Use My Location" later to retry GPS

---

## Files Modified

### Core
- `codepop/ip_address.js` — Dynamic base URL management
- `codepop/App.js` — Initialize base URL on startup
- `codepop/src/components/StoreSelectionModal.js` — **NEW** modal component

### Pages (BASE_URL → getBaseURL())
- `src/pages/GeneralHomePage.js` — Trigger modal, show store banner
- `src/pages/PreferencesPage.js` — Location tab with toggle and change button
- `src/pages/AuthPage.js`
- `src/pages/EmailCheckPage.js`
- `src/pages/CreateAccountPage.js`
- `src/pages/CreateDrinkPage.js`
- `src/pages/CartPage.js`
- `src/pages/ComplaintsPage.js`
- `src/pages/PaymentPage.js`
- `src/pages/CheckoutForm.js`
- `src/pages/PostCheckout.js`
- `src/pages/UpdateDrink.js`
- `src/pages/AdminDash.js`
- `src/pages/ManagerDash.js`

### Components (BASE_URL → getBaseURL())
- `src/components/SeasonalCarousel.js`
- `src/components/RatingCarosel.js`
- `src/components/AIAlert.js`

---

## Future Enhancements

1. **Reverse Geolocation** — display street addresses alongside lat/lng on map
2. **Store Hours** — show hours of operation per store
3. **User Store History** — remember recently visited stores for quick re-selection
4. **Real-time Distance** — re-compute distance as user moves (if using location)
5. **Store Inventory** — show limited availability status per store before selection
6. **Store Search** — text search by store name or zip code

---

## Known Limitations

1. **Mapbox not used** — `react-native-maps` (Google Maps) used instead (simpler, fewer dependencies)
2. **Approximate Location** — GPS accuracy depends on device; city-level precision is sufficient
3. **No route optimization** — stores sorted by distance, not delivery time
4. **Single store per session** — user cannot switch stores mid-session without app restart (by design; could extend with a persistent store-switch button)

---

## Deployment Notes

1. **Hub IPs must be reachable** from the frontend app (VMs must be on the same network or publicly routable)
2. **CORS is open** on backend (`CORS_ALLOW_ALL_ORIGINS = True` in settings.py) — cross-VM requests work
3. **AsyncStorage persists** between app sessions — store selection survives app restart
4. **GPS permissions** require user action on iOS/Android — app gracefully falls back to manual selection if denied

---

## References

- **Hub Store Registry API:** `/backend/api/hub/store-registry/` (open, no auth)
- **Haversine Formula:** Distance calculation between two lat/lng points
- **Expo Location:** https://docs.expo.dev/versions/latest/sdk/location/
- **React Native Maps:** https://github.com/react-native-maps/react-native-maps
