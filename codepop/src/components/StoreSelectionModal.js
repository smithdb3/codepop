import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import Modal from 'react-native-modal';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { setBaseURL, getHubRegistryUrls } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';

/**
 * Haversine formula: calculate distance between two coordinates in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function filterStoresByQuery(stores, query) {
  const t = query.trim().toLowerCase();
  if (!t) return stores;
  return stores.filter((s) => {
    const name = (s.store_name || '').toLowerCase();
    const region = (s.region || '').toLowerCase();
    const idStr = String(s.store_id);
    return name.includes(t) || region.includes(t) || idStr.includes(t);
  });
}

function sortStoresForDisplay(stores, userLocation) {
  const list = [...stores];
  if (userLocation) {
    list.sort((a, b) => {
      const latA = a.latitude != null ? parseFloat(a.latitude) : NaN;
      const lonA = a.longitude != null ? parseFloat(a.longitude) : NaN;
      const latB = b.latitude != null ? parseFloat(b.latitude) : NaN;
      const lonB = b.longitude != null ? parseFloat(b.longitude) : NaN;
      const validA = !Number.isNaN(latA) && !Number.isNaN(lonA);
      const validB = !Number.isNaN(latB) && !Number.isNaN(lonB);
      if (validA && validB) {
        const distA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          latA,
          lonA
        );
        const distB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          latB,
          lonB
        );
        return distA - distB;
      }
      if (validA) return -1;
      if (validB) return 1;
      return (a.store_id || 0) - (b.store_id || 0);
    });
    return list;
  }
  list.sort((a, b) => {
    const regA = (a.region || '').localeCompare(b.region || '');
    if (regA !== 0) return regA;
    return (a.store_id || 0) - (b.store_id || 0);
  });
  return list;
}

async function fetchStoreRegistry() {
  const hubUrls = getHubRegistryUrls();
  if (hubUrls.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    hubUrls.map(async (base) => {
      const url = `${base}/backend/api/hub/store-registry/`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
  );

  const seenIds = new Set();
  const allStores = [];

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    if (settled.status !== 'fulfilled') {
      continue;
    }
    const data = settled.value;
    if (!data || !Array.isArray(data.stores)) {
      continue;
    }
    for (const store of data.stores) {
      if (store == null || store.store_id == null) continue;
      if (seenIds.has(store.store_id)) continue;
      seenIds.add(store.store_id);
      allStores.push(store);
    }
  }

  return allStores;
}

export default function StoreSelectionModal({
  visible,
  onClose,
  requireSelection = false,
}) {
  const { colors } = useTheme();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);

  const displayStores = useMemo(
    () => sortStoresForDisplay(filterStoresByQuery(stores, searchQuery), userLocation),
    [stores, searchQuery, userLocation]
  );

  const mapMarkers = useMemo(() => {
    return stores.filter((s) => {
      if (s.latitude == null || s.longitude == null) return false;
      const lat = parseFloat(s.latitude);
      const lon = parseFloat(s.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lon);
    });
  }, [stores]);

  useEffect(() => {
    if (!visible) return;
    setSelectedStore(null);
    setUserLocation(null);
    setLocationPermission(null);
    setSearchQuery('');
    let cancelled = false;
    (async () => {
      setLoading(true);
      const storeList = await fetchStoreRegistry();
      if (!cancelled) {
        setStores(storeList);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!selectedStore) return;
    const ids = new Set(displayStores.map((s) => s.store_id));
    if (!ids.has(selectedStore.store_id)) {
      setSelectedStore(null);
    }
  }, [displayStores, selectedStore]);

  useEffect(() => {
    if (loading || !mapRef.current) return;
    const coords = [];
    if (userLocation && locationPermission === 'granted') {
      coords.push({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    }
    mapMarkers.forEach((s) => {
      const lat = parseFloat(s.latitude);
      const lon = parseFloat(s.longitude);
      coords.push({ latitude: lat, longitude: lon });
    });
    if (coords.length === 0) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 52, right: 52, bottom: 52, left: 52 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [loading, userLocation, locationPermission, mapMarkers]);

  const handleUseMyLocation = async () => {
    if (locationPermission === 'granted' && userLocation) {
      setUserLocation(null);
      setLocationPermission('manual');
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission('denied');
        Alert.alert(
          'Location off',
          'Enable location in Settings to sort stores by distance and see yourself on the map.'
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setLocationPermission('granted');
    } catch (error) {
      console.warn('Location error:', error);
      setLocationPermission('denied');
      Alert.alert('Location', 'Could not read your position. Try again.');
    } finally {
      setLocating(false);
    }
  };

  const selectAndSave = async (store, permissionStr) => {
    try {
      const lat =
        store.latitude != null && !Number.isNaN(parseFloat(store.latitude))
          ? String(store.latitude)
          : null;
      const lon =
        store.longitude != null && !Number.isNaN(parseFloat(store.longitude))
          ? String(store.longitude)
          : null;

      const pairs = [
        ['locationPermission', permissionStr],
        ['selectedStoreEndpoint', store.api_endpoint],
        ['selectedStoreId', String(store.store_id)],
        ['selectedStoreName', store.store_name],
      ];
      if (lat != null && lon != null) {
        pairs.push(['selectedStoreLatitude', lat], ['selectedStoreLongitude', lon]);
      }
      await AsyncStorage.multiSet(pairs);
      if (lat == null || lon == null) {
        await AsyncStorage.multiRemove(['selectedStoreLatitude', 'selectedStoreLongitude']);
      }
      await setBaseURL(store.api_endpoint);

      // Proactive token exchange: if switching stores while logged in, exchange the home token
      // for a visiting shadow token at the new store
      const homeToken = await AsyncStorage.getItem('homeToken');
      const homeStoreEndpoint = await AsyncStorage.getItem('homeStoreEndpoint');
      const homeStoreId = await AsyncStorage.getItem('homeStoreId');
      const currentEndpoint = /* we need to read this before writing the new one */ null;

      // Only exchange if: we have a home token, the home store endpoint exists, and we're switching stores
      if (homeToken && homeStoreEndpoint && store.api_endpoint !== homeStoreEndpoint) {
        try {
          const exchangeRes = await fetch(`${store.api_endpoint}/backend/auth/exchange/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: homeToken,
              home_store_endpoint: homeStoreEndpoint,
              home_store_id: parseInt(homeStoreId || '0'),
            }),
          });
          if (exchangeRes.ok) {
            const exchangeData = await exchangeRes.json();
            await AsyncStorage.setItem('userToken', exchangeData.token);
            // user_id, first_name, userRole remain the same
          }
          // On 503 (degraded) or network error: silently continue with graceful degradation
        } catch (e) {
          // Network error or other issue - continue with graceful degradation
          // The home token will be used for API calls, returning 403 if unavailable
          console.warn('Token exchange failed, using home token:', e);
        }
      }

      setSelectedStore(store);
    } catch (error) {
      console.error('Failed to save store selection:', error);
      Alert.alert('Error', 'Failed to save store selection');
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedStore) {
      Alert.alert('Please select a store');
      return;
    }
    const perm =
      locationPermission === 'granted'
        ? 'granted'
        : locationPermission === 'denied'
          ? 'denied'
          : 'manual';
    await selectAndSave(selectedStore, perm);
    onClose?.({ cancelled: false });
  };

  const dismissWithoutConfirm = () => {
    onClose?.({ cancelled: true });
  };

  const handleBackdropPress = () => {
    if (requireSelection) {
      Alert.alert('Select a store', 'Choose your CodePop location and tap Confirm to continue.');
      return;
    }
    dismissWithoutConfirm();
  };

  const handleHardwareBackPress = () => {
    if (requireSelection) {
      return;
    }
    dismissWithoutConfirm();
  };

  const handleMarkerPress = (store) => {
    setSelectedStore(store);
    if (store.latitude != null && store.longitude != null) {
      const lat = parseFloat(store.latitude);
      const lon = parseFloat(store.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          400
        );
      }
    }
  };

  const initialMapRegion = {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 15,
    longitudeDelta: 15,
  };

  const showUserOnMap = locationPermission === 'granted' && userLocation != null;
  const locationActive = showUserOnMap;

  const renderStoreCard = ({ item }) => {
    const isSelected = selectedStore?.store_id === item.store_id;
    let distance = '';
    if (userLocation && item.latitude != null && item.longitude != null) {
      const lat = parseFloat(item.latitude);
      const lon = parseFloat(item.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        const dist = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          lat,
          lon
        );
        distance = ` • ${dist.toFixed(1)} mi`;
      }
    }
    const regionLabel = item.region
      ? item.region.charAt(0).toUpperCase() + item.region.slice(1)
      : 'Store';

    return (
      <TouchableOpacity
        style={[
          dynamicStyles.storeCard,
          isSelected && dynamicStyles.storeCardSelected,
        ]}
        onPress={() => setSelectedStore(item)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="location-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.storeName}>{item.store_name}</Text>
            <Text style={dynamicStyles.storeRegion}>
              {regionLabel}
              {distance}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = makeStyles(colors);

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={dynamicStyles.modalRoot}
      propagateSwipe
      onBackdropPress={handleBackdropPress}
      onBackButtonPress={handleHardwareBackPress}
      swipeDirection={requireSelection ? undefined : 'down'}
      onSwipeComplete={requireSelection ? undefined : dismissWithoutConfirm}
    >
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.sheetHeader}>
          <View
            style={dynamicStyles.sheetGrabber}
            accessibilityLabel={
              requireSelection ? 'Store selection required' : 'Swipe down to close'
            }
          />
          <Text style={dynamicStyles.sheetTitle}>Choose your store</Text>
          <Text style={dynamicStyles.sheetSubtitle}>
            Tap a pin or pick from the list
          </Text>
        </View>

        <View style={dynamicStyles.mapContainer}>
          <MapView
            ref={mapRef}
            style={dynamicStyles.map}
            initialRegion={initialMapRegion}
            showsUserLocation={showUserOnMap}
          >
            {mapMarkers.map((store) => {
              const lat = parseFloat(store.latitude);
              const lon = parseFloat(store.longitude);
              return (
                <Marker
                  key={store.store_id}
                  coordinate={{ latitude: lat, longitude: lon }}
                  title={store.store_name}
                  onPress={() => handleMarkerPress(store)}
                />
              );
            })}
          </MapView>
          {loading && (
            <View style={[dynamicStyles.mapLoadingOverlay, { backgroundColor: colors.surface2 }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={dynamicStyles.mapLoadingText}>Loading stores…</Text>
            </View>
          )}
        </View>

        <View style={dynamicStyles.listContainer}>
          <Text style={dynamicStyles.listHeading}>Stores</Text>
          <View style={dynamicStyles.searchAndLocateRow}>
            <View style={dynamicStyles.searchRow}>
              <Icon name="search-outline" size={20} color={colors.textMuted} style={dynamicStyles.searchIcon} />
              <TextInput
                style={dynamicStyles.searchInput}
                placeholder="Search name, region, or ID"
                placeholderTextColor={colors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={dynamicStyles.clearSearch}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                dynamicStyles.locateButton,
                locationActive && dynamicStyles.locateButtonActive,
              ]}
              onPress={handleUseMyLocation}
              disabled={locating}
              accessibilityRole="button"
              accessibilityLabel={
                locationActive ? 'Turn off location sorting' : 'Use my location to sort by distance'
              }
            >
              {locating ? (
                <ActivityIndicator size="small" color={locationActive ? '#FFFFFF' : colors.primary} />
              ) : (
                <Icon
                  name={locationActive ? 'navigate' : 'navigate-outline'}
                  size={22}
                  color={locationActive ? '#FFFFFF' : colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={displayStores}
            renderItem={renderStoreCard}
            keyExtractor={(item) => String(item.store_id)}
            scrollEnabled
            style={dynamicStyles.list}
            ListEmptyComponent={
              <Text style={dynamicStyles.emptySearch}>
                {stores.length === 0 && !loading
                  ? "Couldn't load stores. Check your connection and try again."
                  : stores.length === 0 && loading
                    ? ''
                    : 'No stores match your search'}
              </Text>
            }
          />
          <TouchableOpacity
            style={[
              dynamicStyles.primaryButton,
              { width: '100%' },
              !selectedStore && dynamicStyles.primaryButtonDisabled,
            ]}
            onPress={handleConfirmSelection}
            disabled={!selectedStore}
          >
            <Text style={dynamicStyles.primaryButtonText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const SHEET_RADIUS = 20;

const makeStyles = (colors) =>
  StyleSheet.create({
    modalRoot: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: colors.surface,
      borderTopLeftRadius: SHEET_RADIUS,
      borderTopRightRadius: SHEET_RADIUS,
      borderBottomLeftRadius: SHEET_RADIUS,
      borderBottomRightRadius: SHEET_RADIUS,
      overflow: 'hidden',
      width: '100%',
      paddingBottom: 12,
      maxHeight: '92%',
    },
    sheetHeader: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    sheetGrabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    sheetSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    mapContainer: {
      height: 220,
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface2,
    },
    map: {
      flex: 1,
    },
    mapLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapLoadingText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
    },
    listHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    searchAndLocateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    searchRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface2,
      paddingHorizontal: 10,
      minHeight: 48,
    },
    locateButton: {
      width: 48,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locateButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
    },
    clearSearch: {
      padding: 4,
    },
    emptySearch: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 24,
    },
    list: {
      flex: 1,
      marginBottom: 12,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    storeCard: {
      backgroundColor: colors.surface2,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    storeCardSelected: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      backgroundColor: colors.surface,
      borderColor: colors.primary,
    },
    storeName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    storeRegion: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
