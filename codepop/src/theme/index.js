import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'themeMode';

export const lightColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surface2: '#F3F4F6',
  textPrimary: '#222831',
  textMuted: '#6B7280',
  textPlaceholder: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  emptyIcon: '#D1D5DB',
  primary: '#FF2E63',
  secondary: '#08D9D6',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navbarBg: '#FFFFFF',
};

export const darkColors = {
  background: '#111318',
  surface: '#1C1F28',
  surface2: '#272B38',
  textPrimary: '#EAEDF5',
  textMuted: '#8B8FA8',
  textPlaceholder: '#5A5E75',
  border: '#32364A',
  borderLight: '#272B38',
  emptyIcon: '#484D6A',
  primary: '#FF2E63',
  secondary: '#08D9D6',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navbarBg: '#1C1F28',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, _setThemeMode] = useState('system');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) _setThemeMode(saved);
    });
  }, []);

  const setThemeMode = (mode) => {
    _setThemeMode(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  };

  // Resolve effective scheme
  const effectiveScheme =
    themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  const colors = effectiveScheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
