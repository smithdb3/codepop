import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PRIMARY_HUB_URL = 'http://34.136.12.86:8000';     // Logan hub
const FALLBACK_HUB_URL = 'http://136.115.168.184:8000'; // Atlanta hub

// Local development URL (default fallback before store selection)
const LOCAL_DEV_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://localhost:8000';

// Module-level cache for store base URL
// Defaults to local dev until user selects a store (stored in AsyncStorage)
let _storeBaseURL = LOCAL_DEV_URL;

/**
 * Get the current base URL for API calls.
 * Returns the selected store's endpoint or defaults to Logan hub.
 */
export function getBaseURL() {
  return _storeBaseURL;
}

/**
 * Initialize the base URL from AsyncStorage on app startup.
 * Reads the saved selectedStoreEndpoint and updates the cache.
 */
export async function initBaseURL() {
  try {
    const savedEndpoint = await AsyncStorage.getItem('selectedStoreEndpoint');
    if (savedEndpoint) {
      _storeBaseURL = savedEndpoint;
    }
  } catch (error) {
    console.warn('Failed to init base URL from AsyncStorage:', error);
    // Fall through to default (LOCAL_DEV_URL)
  }
}

/**
 * Set a new base URL and persist it to AsyncStorage.
 */
export async function setBaseURL(url) {
  try {
    _storeBaseURL = url;
    await AsyncStorage.setItem('selectedStoreEndpoint', url);
  } catch (error) {
    console.error('Failed to save base URL to AsyncStorage:', error);
    // Still update the cache even if storage fails
  }
}

/**
 * Get the hub URL for fetching store registry.
 * Used only during store selection flow.
 */
export function getPrimaryHubURL() {
  return PRIMARY_HUB_URL;
}

export function getFallbackHubURL() {
  return FALLBACK_HUB_URL;
}
