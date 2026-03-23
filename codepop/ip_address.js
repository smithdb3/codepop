import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Default regional hubs used when no EXPO_PUBLIC_HUB_REGISTRY_URLS is set.
 * Add or reorder entries here as you deploy more hubs.
 * Duplicates are removed; merge uses first-seen store_id across hubs.
 */
const DEFAULT_HUB_REGISTRY_URLS = [
  'http://34.136.12.86:8000', // Logan hub
  'http://136.115.168.184:8000', // Atlanta hub
];

// Local development URL (default fallback before store selection)
const LOCAL_DEV_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://localhost:8000';

// Module-level cache for store base URL
// Defaults to local dev until user selects a store (stored in AsyncStorage)
let _storeBaseURL = LOCAL_DEV_URL;

function normalizeHubBaseUrl(url) {
  const u = (url || '').trim();
  if (!u) return '';
  return u.replace(/\/+$/, '');
}

function dedupeHubUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const n = normalizeHubBaseUrl(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * Hub base URLs used only for store registry aggregation (store picker).
 * Set EXPO_PUBLIC_HUB_REGISTRY_URLS to a comma-separated list to override defaults
 * (e.g. in .env: EXPO_PUBLIC_HUB_REGISTRY_URLS=http://a:8000,http://b:8000).
 * Restart Expo after changing env vars.
 */
export function getHubRegistryUrls() {
  const envRaw = process.env.EXPO_PUBLIC_HUB_REGISTRY_URLS;
  if (typeof envRaw === 'string' && envRaw.trim()) {
    const fromEnv = envRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (fromEnv.length > 0) {
      return dedupeHubUrls(fromEnv);
    }
  }
  return dedupeHubUrls(DEFAULT_HUB_REGISTRY_URLS);
}

/**
 * Get the current base URL for API calls.
 * Returns the selected store's endpoint or defaults to local dev.
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
