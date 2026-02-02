import { Platform } from 'react-native';

/**
 * Backend API Configuration
 *
 * Automatically detects the platform and returns the appropriate backend URL.
 *
 * Development URLs:
 * - iOS Simulator/Emulator: localhost:8000 (shares host network stack)
 * - Android Emulator: 10.0.2.2:8000 (special IP that routes to host machine)
 * - Physical Device: Use your machine's local IP address on same WiFi network
 *
 * Production: Set PROD_BACKEND_URL environment variable when building for release
 */

// Development configuration (local backend server)
const DEV_CONFIG = {
  ios: 'http://localhost:8000',
  android: 'http://10.0.2.2:8000',
  // For testing on physical devices, replace with your machine's IP address:
  // Get your IP: macOS/Linux: `ipconfig getifaddr en0`, Windows: `ipconfig`
  default: 'http://localhost:8000'
};

// Production configuration (deployed backend)
const PROD_CONFIG = {
  // Set this via environment variable when deploying
  url: process.env.PROD_BACKEND_URL || 'https://api.codepop.com'
};

/**
 * Returns the appropriate backend URL based on environment and platform
 */
function getBaseURL() {
  // Use production URL if not in development mode
  if (!__DEV__) {
    return PROD_CONFIG.url;
  }

  // Development mode: return platform-specific URL
  if (Platform.OS === 'android') {
    return DEV_CONFIG.android;
  } else if (Platform.OS === 'ios') {
    return DEV_CONFIG.ios;
  } else {
    return DEV_CONFIG.default;
  }
}

const BASE_URL = getBaseURL();

// Log the selected URL for debugging
console.log(`[CodePop] Running on ${Platform.OS} with BASE_URL: ${BASE_URL}`);

export { BASE_URL };