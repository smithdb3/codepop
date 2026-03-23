import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { setBaseURL, getPrimaryHubURL, getFallbackHubURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CodePopLogo } from './CodePopLogo';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');

/**
 * Haversine formula: calculate distance between two coordinates in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
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

/**
 * Fetch store registry from all hubs and merge results
 */
async function fetchStoreRegistry() {
  const primaryURL = getPrimaryHubURL();
  const fallbackURL = getFallbackHubURL();
  const allStores = [];

  // Fetch from primary hub
  try {
    const response = await fetch(`${primaryURL}/backend/api/hub/store-registry/`);
    if (response.ok) {
      const data = await response.json();
      if (data.stores && Array.isArray(data.stores)) {
        allStores.push(...data.stores);
        console.log(`Fetched ${data.stores.length} stores from primary hub`);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from primary hub:', err);
  }

  // Also fetch from fallback hub to get stores from all regions
  try {
    const response = await fetch(`${fallbackURL}/backend/api/hub/store-registry/`);
    if (response.ok) {
      const data = await response.json();
      if (data.stores && Array.isArray(data.stores)) {
        // Merge stores, avoiding duplicates by store_id
        const existingIds = new Set(allStores.map(s => s.store_id));
        const newStores = data.stores.filter(s => !existingIds.has(s.store_id));
        allStores.push(...newStores);
        console.log(`Fetched ${newStores.length} additional stores from fallback hub`);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from fallback hub:', err);
  }

  console.log(`Total stores available: ${allStores.length}`, allStores);
  return allStores;
}

export default function StoreSelectionModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState('permission'); // 'permission' or 'selection'
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [mapRef, setMapRef] = useState(null);

  // Fetch stores on mount
  useEffect(() => {
    if (visible && phase === 'permission') {
      loadStores();
    }
  }, [visible, phase]);

  const loadStores = async () => {
    setLoading(true);
    const storeList = await fetchStoreRegistry();
    console.log('Stores loaded:', storeList);
    setStores(storeList);
    setLoading(false);
  };

  const handleAllowLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission('granted');
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });

        // Auto-select nearest store
        let nearestStore = stores[0];
        let minDistance = Infinity;

        stores.forEach((store) => {
          if (store.latitude && store.longitude) {
            const distance = calculateDistance(
              latitude,
              longitude,
              store.latitude,
              store.longitude
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestStore = store;
            }
          }
        });

        await selectAndSave(nearestStore);
        onClose();
        return;
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }

    setLoading(false);
    // If permission denied, move to selection phase
    setLocationPermission('denied');
    setPhase('selection');
  };

  const handleChooseManually = () => {
    setPhase('selection');
  };

  const selectAndSave = async (store) => {
    try {
      await AsyncStorage.multiSet([
        ['locationPermission', locationPermission || 'manual'],
        ['selectedStoreEndpoint', store.api_endpoint],
        ['selectedStoreId', String(store.store_id)],
        ['selectedStoreName', store.store_name],
      ]);
      await setBaseURL(store.api_endpoint);
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
    await selectAndSave(selectedStore);
    onClose();
  };

  const handleMarkerPress = (store) => {
    setSelectedStore(store);
    if (mapRef) {
      mapRef.animateToRegion(
        {
          latitude: store.latitude,
          longitude: store.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        500
      );
    }
  };

  const sortedStores = [...stores].sort((a, b) => {
    // Sort by region first, then by distance if user location available
    if (a.region !== b.region) {
      return a.region.localeCompare(b.region);
    }
    if (userLocation && a.latitude && a.longitude && b.latitude && b.longitude) {
      const distA = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      const distB = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      return distA - distB;
    }
    return a.store_id - b.store_id;
  });

  const renderStoreCard = ({ item }) => {
    const isSelected = selectedStore?.store_id === item.store_id;
    let distance = '';
    if (userLocation && item.latitude && item.longitude) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.latitude,
        item.longitude
      );
      distance = ` • ${dist.toFixed(1)}mi`;
    }

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
              {item.region.charAt(0).toUpperCase() + item.region.slice(1)}{distance}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const initialMapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 5,
        longitudeDelta: 5,
      }
    : {
        latitude: 39.8283,
        longitude: -98.5795, // Center of USA
        latitudeDelta: 15,
        longitudeDelta: 15,
      };

  const dynamicStyles = makeStyles(colors);

  return (
    <Modal isVisible={visible} animationIn="slideInUp" animationOut="slideOutDown">
      {phase === 'permission' ? (
        // Phase 1: Location Permission
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.content}>
            <CodePopLogo size={64} />
            <Text style={dynamicStyles.heading}>Find Your Nearest CodePop</Text>
            <Text style={dynamicStyles.description}>
              Allow location access to find the closest CodePop station to you.
              You can also choose manually.
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <TouchableOpacity
                  style={dynamicStyles.primaryButton}
                  onPress={handleAllowLocation}
                >
                  <Text style={dynamicStyles.primaryButtonText}>Allow Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={handleChooseManually}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    Choose Manually
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        // Phase 2: Store Selection with Map
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.mapContainer}>
            <MapView
              ref={setMapRef}
              style={dynamicStyles.map}
              initialRegion={initialMapRegion}
            >
              {stores.map((store) =>
                store.latitude && store.longitude ? (
                  <Marker
                    key={store.store_id}
                    coordinate={{
                      latitude: parseFloat(store.latitude),
                      longitude: parseFloat(store.longitude),
                    }}
                    title={store.store_name}
                    onPress={() => handleMarkerPress(store)}
                  />
                ) : null
              )}
            </MapView>
          </View>

          <View style={dynamicStyles.listContainer}>
            <Text style={dynamicStyles.listHeading}>Select a Store</Text>
            <FlatList
              data={sortedStores}
              renderItem={renderStoreCard}
              keyExtractor={(item) => String(item.store_id)}
              scrollEnabled={true}
              style={dynamicStyles.list}
            />
            <TouchableOpacity
              style={[dynamicStyles.primaryButton, { width: '100%' }]}
              onPress={handleConfirmSelection}
              disabled={!selectedStore}
            >
              <Text style={dynamicStyles.primaryButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      width: '100%',
      paddingBottom: 8,
    },
    content: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    heading: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    description: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 44,
      marginVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 44,
      marginVertical: 8,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    mapContainer: {
      height: 180,
      marginHorizontal: 12,
      marginVertical: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 0,
      paddingBottom: 12,
    },
    listHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
    },
    list: {
      flex: 1,
      marginBottom: 12,
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
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
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
