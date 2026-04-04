import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavBar from '../components/NavBar';
import { getBaseURL } from '../../ip_address';
import { useTheme } from '../theme';
import StoreSelectionModal from '../components/StoreSelectionModal';
import TabNavigationContext from '../context/TabNavigationContext';

const PreferencesPage = ({ insideTabContainer = false, isFocused = true, navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const isNavFocused = useIsFocused();
  const tabNav = useContext(TabNavigationContext);
  const { colors, themeMode, setThemeMode } = useTheme();

  // Auth & User State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userToken, setUserToken] = useState('');
  const [username, setUsername] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('location');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState('');

  // Account Settings Form States
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences & Privacy States
  const [notifOrderStatus, setNotifOrderStatus] = useState(true);
  const [notifPromo, setNotifPromo] = useState(true);
  const [notifNewItems, setNotifNewItems] = useState(false);
  const [notifPush, setNotifPush] = useState(true);

  // Recurring Orders States
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState('');
  const [showEditRecurringModal, setShowEditRecurringModal] = useState(false);
  const [selectedRecurringOrder, setSelectedRecurringOrder] = useState(null);
  const [editInterval, setEditInterval] = useState('1');
  const [editUnit, setEditUnit] = useState('week');
  const [editDays, setEditDays] = useState({ S: false, M: false, T: false, W: false, Th: false, F: false, Sa: false });
  const [editEndType, setEditEndType] = useState('never');
  const [editEndDate, setEditEndDate] = useState('');
  const [editOccurrences, setEditOccurrences] = useState('13');

  // Load data on focus
  useEffect(() => {
    if (!isFocused || !isNavFocused) return;
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await checkLoginStatus();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isFocused, isNavFocused]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const firstName = await AsyncStorage.getItem('first_name');
      const email = await AsyncStorage.getItem('userEmail');
      const id = await AsyncStorage.getItem('userId');
      const storeName = await AsyncStorage.getItem('selectedStoreName');

      if (token && firstName && id) {
        setIsLoggedIn(true);
        setFirstName(firstName);
        setUserEmail(email || '');
        setUserId(id);
        setUserToken(token);
        setSelectedStoreName(storeName || 'Unknown Store');

        // Fetch current username from API
        try {
          const response = await fetch(`${getBaseURL()}/backend/users/me/`, {
            method: 'GET',
            headers: { 'Authorization': `Token ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUsername(data.email || '');
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const fetchRecurringOrders = async () => {
    if (!userId || !userToken) return;
    setRecurringLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/users/${userId}/recurring-orders/`, {
        method: 'GET',
        headers: { 'Authorization': `Token ${userToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecurringOrders(Array.isArray(data) ? data : data.results || []);
        setRecurringError('');
      } else {
        setRecurringError('Failed to load recurring orders');
      }
    } catch (error) {
      console.error('Error fetching recurring orders:', error);
      setRecurringError('Error loading recurring orders');
    } finally {
      setRecurringLoading(false);
    }
  };

  // Fetch recurring orders when tab becomes active
  useEffect(() => {
    if (activeTab === 'recurring' && isLoggedIn) {
      fetchRecurringOrders();
    }
  }, [activeTab, isLoggedIn, userId, userToken]);

  // Helper function: password strength
  const getPasswordStrength = (password) => {
    if (password.length < 8) return 'weak';
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasUppercase && hasDigit && hasSpecial) return 'strong';
    if (hasUppercase || hasDigit) return 'medium';
    return 'weak';
  };

  // Account Settings Handlers
  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Required', 'Please enter a new email');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${getBaseURL()}/backend/users/me/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ email: newUsername.trim() }),
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) {
        Alert.alert('Error', data.error || `Failed to update email (${response.status})`);
        return;
      }
      setUsername(data.email);
      setUserEmail(data.email);
      await AsyncStorage.setItem('userEmail', data.email);
      setNewUsername('');
      setShowChangeUsername(false);
      Alert.alert('Success', 'Email updated');
    } catch (e) {
      console.error('Update email error:', e);
      Alert.alert('Error', 'Could not update email');
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required Fields', 'All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New passwords do not match');
      return;
    }
    const strength = getPasswordStrength(newPassword);
    if (strength === 'weak') {
      Alert.alert('Weak Password', 'Password must be at least 8 characters');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${getBaseURL()}/backend/users/me/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to update password');
        return;
      }
      handleCancelPasswordForm();
      Alert.alert('Success', 'Password updated');
    } catch (e) {
      Alert.alert('Error', 'Could not update password');
    }
  };

  const handleCancelUsernameForm = () => {
    setNewUsername('');
    setShowChangeUsername(false);
  };

  const handleCancelPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePassword(false);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/logout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Clear AsyncStorage on success (200) or if token is already invalid (401)
      if (response.status === 200 || response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userEmail');

        setIsLoggedIn(false);
        setFirstName('');
        setUserEmail('');
        setUserId('');
        setUserToken('');
        tabNav?.navigateToTab(0);
      } else {
        Alert.alert('Logout failed, please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout failed, please try again later.');
    }
  };

  const makeStyles = (colors) => StyleSheet.create({
    wholePage: {
      flex: 1,
      backgroundColor: colors.background,
    },
    notLoggedInContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 80,
    },
    notLoggedInTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 32,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    profileHeader: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    editButton: {
      padding: 8,
    },
    loyaltyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    loyaltyBadge: {
      backgroundColor: '#FFF9E6',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    loyaltyText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#B45309',
    },
    memberSince: {
      fontSize: 12,
      color: colors.textMuted,
    },
    tabBarWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabBarContainer: {
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    tabButton: {
      minWidth: 120,
      minHeight: 44,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginRight: 4,
    },
    tabButtonActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    tabButtonTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
    },
    subsectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    storeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface2,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    storeCardName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    storeCardDetail: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    secondaryButton: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    helperText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    settingValue: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    changeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    inlineForm: {
      marginTop: 12,
      gap: 10,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.surface2,
    },
    formButtonRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    cancelButton: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    strengthBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    strengthSegmentRow: {
      flexDirection: 'row',
      gap: 4,
      flex: 1,
    },
    strengthSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 8,
    },
    settingDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: 12,
    },
    radioRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    radioPill: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface2,
    },
    radioPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    radioPillText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
    },
    radioPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    notifRowDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
    },
    notifLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    emptyStateCard: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptyStateSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 12,
    },
    comingSoonBadge: {
      backgroundColor: '#E0F2FE',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    comingSoonText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#0369A1',
    },
    ghostCard: {
      opacity: 0.45,
    },
    ghostCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    ghostCardLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPlaceholder,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    ghostCardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    ghostCardDetail: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 2,
    },
    ghostButtonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    ghostActionButton: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    ghostActionButtonText: {
      fontSize: 12,
      color: colors.textPlaceholder,
      fontWeight: '500',
    },
    statusBadge: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: colors.surface2,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    logoutButton: {
      backgroundColor: colors.error,
      marginHorizontal: 16,
      marginTop: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    navBarSpace: {
      height: 80,
    },

    // Recurring Orders Tab Styles
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    recurringCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    recurringCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    recurringCardSchedule: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 8,
    },
    recurringCardPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 12,
    },
    recurringButtonRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    recurringActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recurringActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#08D9D6',
    },
    statusBadge: {
      backgroundColor: '#D1FAE5',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    statusBadgeActive: {
      backgroundColor: '#D1FAE5',
    },
    statusBadgePaused: {
      backgroundColor: '#FEF3C7',
    },
    statusBadgeCancelled: {
      backgroundColor: '#FEE2E2',
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#065F46',
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalSection: {
      marginBottom: 20,
    },
    modalSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    modalInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modalNumberInput: {
      width: 50,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalUnitButtons: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
    },
    modalUnitButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalUnitButtonActive: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    modalUnitButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    modalUnitButtonTextActive: {
      color: '#FFFFFF',
    },
    modalDaysGrid: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    modalDayButton: {
      width: '14%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    modalDayButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalDayButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    modalDayButtonTextActive: {
      color: '#FFFFFF',
    },
    modalRadioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    modalRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalRadioActive: {
      borderColor: colors.primary,
    },
    modalRadioFill: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    modalRadioLabel: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    modalDateInput: {
      width: 120,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.textPrimary,
    },
    modalOccurrencesInput: {
      width: 60,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalButtonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButtonCancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalButtonSave: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonSaveText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  const styles = makeStyles(colors);

  const renderNotLoggedIn = () => (
    <View style={[styles.wholePage, insideTabContainer && { paddingBottom: 50 }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.notLoggedInContainer}>
          <Icon name="lock-closed-outline" size={64} color={colors.emptyIcon} />
          <Text style={styles.notLoggedInTitle}>Sign in to view your profile</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {!insideTabContainer && <NavBar />}
    </View>
  );

  // Tab Bar Tabs
  const TAB_LABELS = {
    location: 'Location & Delivery',
    account: 'Account Settings',
    preferences: 'Preferences & Privacy',
    recurring: 'Recurring Orders',
  };

  // Tab Render Functions
  const renderLocationTab = () => (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>PRIMARY STORE LOCATION</Text>
      <View style={styles.storeCard}>
        <Icon name="storefront-outline" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.storeCardName}>{selectedStoreName}</Text>
          <Text style={styles.storeCardDetail}>Currently selected</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setShowStoreModal(true)}
      >
        <Text style={styles.secondaryButtonText}>Change Store</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAccountTab = () => (
    <View style={styles.card}>
      {/* Username Subsection */}
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Email</Text>
          <Text style={styles.settingValue}>{username || userEmail || 'Not available'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            handleCancelPasswordForm(); // close password form if open
            setShowChangeUsername(!showChangeUsername);
          }}
        >
          <Text style={styles.changeButtonText}>
            {showChangeUsername ? 'Cancel' : 'Change Email'}
          </Text>
        </TouchableOpacity>
      </View>

      {showChangeUsername && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.textInput}
            placeholder="New email"
            placeholderTextColor={colors.textPlaceholder}
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.formButtonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={handleUpdateUsername}
            >
              <Text style={styles.primaryButtonText}>Update Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { flex: 1 }]}
              onPress={handleCancelUsernameForm}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.settingDivider} />

      {/* Password Subsection */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => {
          handleCancelUsernameForm(); // close username form if open
          setShowChangePassword(!showChangePassword);
        }}
      >
        <Text style={styles.settingLabel}>Change Password</Text>
        <Text style={styles.changeButtonText}>
          {showChangePassword ? 'Cancel' : 'Change'}
        </Text>
      </TouchableOpacity>

      {showChangePassword && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.textInput}
            placeholder="Current password"
            placeholderTextColor={colors.textPlaceholder}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.textInput}
            placeholder="New password"
            placeholderTextColor={colors.textPlaceholder}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          {newPassword.length > 0 && (
            <View style={styles.strengthBarContainer}>
              <View style={styles.strengthSegmentRow}>
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor:
                        getPasswordStrength(newPassword) === 'weak'
                          ? '#EF4444'
                          : getPasswordStrength(newPassword) === 'medium'
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor:
                        getPasswordStrength(newPassword) === 'medium' ||
                        getPasswordStrength(newPassword) === 'strong'
                          ? getPasswordStrength(newPassword) === 'medium'
                            ? '#F59E0B'
                            : '#10B981'
                          : '#E5E7EB',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor:
                        getPasswordStrength(newPassword) === 'strong'
                          ? '#10B981'
                          : '#E5E7EB',
                    },
                  ]}
                />
              </View>
              <Text style={styles.strengthLabel}>
                {getPasswordStrength(newPassword).charAt(0).toUpperCase() +
                  getPasswordStrength(newPassword).slice(1)}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.textInput}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textPlaceholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <View style={styles.formButtonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={handleUpdatePassword}
            >
              <Text style={styles.primaryButtonText}>Update Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { flex: 1 }]}
              onPress={handleCancelPasswordForm}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderPreferencesTab = () => (
    <View style={styles.card}>
      {/* Appearance Subsection */}
      <Text style={styles.subsectionLabel}>Appearance</Text>
      <View style={styles.radioRow}>
        {['system', 'light', 'dark'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.radioPill,
              activeTab === 'preferences' && themeMode === mode && styles.radioPillActive,
            ]}
            onPress={() => setThemeMode(mode)}
          >
            <Text
              style={[
                styles.radioPillText,
                themeMode === mode && styles.radioPillTextActive,
              ]}
            >
              {mode === 'system'
                ? 'System Default'
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.settingDivider} />

      {/* Notifications Subsection */}
      <Text style={[styles.subsectionLabel, { marginTop: 12 }]}>Notifications</Text>
      <View style={styles.notifRow}>
        <Text style={styles.notifLabel}>Order Status Updates</Text>
        <Switch
          value={notifOrderStatus}
          onValueChange={setNotifOrderStatus}
          trackColor={{ false: '#E5E7EB', true: '#08D9D6' }}
          thumbColor={notifOrderStatus ? '#FF2E63' : '#FFFFFF'}
        />
      </View>
      <View style={styles.notifRowDivider} />

      <View style={styles.notifRow}>
        <Text style={styles.notifLabel}>Promotional Emails</Text>
        <Switch
          value={notifPromo}
          onValueChange={setNotifPromo}
          trackColor={{ false: '#E5E7EB', true: '#08D9D6' }}
          thumbColor={notifPromo ? '#FF2E63' : '#FFFFFF'}
        />
      </View>
      <View style={styles.notifRowDivider} />

      <View style={styles.notifRow}>
        <Text style={styles.notifLabel}>New Menu Items</Text>
        <Switch
          value={notifNewItems}
          onValueChange={setNotifNewItems}
          trackColor={{ false: '#E5E7EB', true: '#08D9D6' }}
          thumbColor={notifNewItems ? '#FF2E63' : '#FFFFFF'}
        />
      </View>
      <View style={styles.notifRowDivider} />

      <View style={styles.notifRow}>
        <Text style={styles.notifLabel}>Push Notifications</Text>
        <Switch
          value={notifPush}
          onValueChange={setNotifPush}
          trackColor={{ false: '#E5E7EB', true: '#08D9D6' }}
          thumbColor={notifPush ? '#FF2E63' : '#FFFFFF'}
        />
      </View>
    </View>
  );

  const toggleEditDay = (day) => {
    setEditDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleOpenEditModal = (order) => {
    setSelectedRecurringOrder(order);
    setEditInterval(order.interval.toString());
    setEditUnit(order.unit);
    setEditDays(order.days || { S: false, M: false, T: false, W: false, Th: false, F: false, Sa: false });
    setEditEndType(order.end_type);
    setEditEndDate(order.end_date || '');
    setEditOccurrences(order.occurrences?.toString() || '13');
    setShowEditRecurringModal(true);
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr || dateStr === '') return null;
    // Date should be in YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    // If it's not, try to parse and convert
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error parsing date:', e);
      return null;
    }
  };

  const handleSaveEditRecurringOrder = async () => {
    if (!selectedRecurringOrder) return;
    try {
      const response = await fetch(
        `${getBaseURL()}/backend/recurring-orders/${selectedRecurringOrder.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${userToken}`,
          },
          body: JSON.stringify({
            interval: parseInt(editInterval),
            unit: editUnit,
            days: editDays,
            end_type: editEndType,
            end_date: formatDateForBackend(editEndDate),
            occurrences: editOccurrences ? parseInt(editOccurrences) : null,
          }),
        }
      );
      if (response.ok) {
        setShowEditRecurringModal(false);
        fetchRecurringOrders();
        Alert.alert('Success', 'Recurring order updated');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to update recurring order');
      }
    } catch (error) {
      console.error('Error updating recurring order:', error);
      Alert.alert('Error', 'Could not update recurring order');
    }
  };

  const handleTogglePauseResume = async (order) => {
    try {
      const newStatus = order.status === 'active' ? 'paused' : 'active';
      const response = await fetch(
        `${getBaseURL()}/backend/recurring-orders/${order.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${userToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (response.ok) {
        fetchRecurringOrders();
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      Alert.alert('Error', 'Could not update status');
    }
  };

  const handleCancelRecurringOrder = (order) => {
    Alert.alert(
      'Cancel Recurring Order',
      'Are you sure you want to cancel this recurring order?',
      [
        { text: 'No', onPress: () => {} },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await fetch(
                `${getBaseURL()}/backend/recurring-orders/${order.id}/`,
                {
                  method: 'DELETE',
                  headers: { 'Authorization': `Token ${userToken}` },
                }
              );
              if (response.ok) {
                fetchRecurringOrders();
                Alert.alert('Success', 'Recurring order cancelled');
              } else {
                Alert.alert('Error', 'Failed to cancel recurring order');
              }
            } catch (error) {
              console.error('Error cancelling recurring order:', error);
              Alert.alert('Error', 'Could not cancel recurring order');
            }
          },
        },
      ]
    );
  };

  const formatSchedule = (order) => {
    const days = order.days || {};
    const selectedDays = Object.keys(days)
      .filter((day) => days[day])
      .join(', ');
    return `Every ${order.interval} ${order.unit}${selectedDays ? ` on ${selectedDays}` : ''}`;
  };

  const renderRecurringTab = () => {
    if (recurringLoading) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading recurring orders...</Text>
        </View>
      );
    }

    if (recurringOrders.length === 0) {
      return (
        <View style={styles.card}>
          <View style={styles.emptyStateCard}>
            <Icon name="time-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No recurring orders yet</Text>
            <Text style={styles.emptyStateSubtitle}>Set up a recurring order at checkout</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        {recurringOrders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.recurringCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recurringCardTitle}>
                  {order.drinks?.length > 0 ? `Order #${order.id}` : 'Recurring Order'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  order.status === 'active' && styles.statusBadgeActive,
                  order.status === 'paused' && styles.statusBadgePaused,
                  order.status === 'cancelled' && styles.statusBadgeCancelled,
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.recurringCardSchedule}>{formatSchedule(order)}</Text>
            <Text style={styles.recurringCardPrice}>${parseFloat(order.total_price || 0).toFixed(2)}</Text>
            <View style={styles.recurringButtonRow}>
              <TouchableOpacity
                style={styles.recurringActionButton}
                onPress={() => handleOpenEditModal(order)}
              >
                <Icon name="pencil-outline" size={16} color="#08D9D6" />
                <Text style={styles.recurringActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recurringActionButton}
                onPress={() => handleTogglePauseResume(order)}
              >
                <Icon name={order.status === 'active' ? 'pause' : 'play'} size={16} color="#F59E0B" />
                <Text style={styles.recurringActionText}>
                  {order.status === 'active' ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recurringActionButton}
                onPress={() => handleCancelRecurringOrder(order)}
              >
                <Icon name="trash-outline" size={16} color="#EF4444" />
                <Text style={[styles.recurringActionText, { color: '#EF4444' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </>
    );
  };

  const handleStoreModalClose = async () => {
    setShowStoreModal(false);
    const storeName = await AsyncStorage.getItem('selectedStoreName');
    setSelectedStoreName(storeName || 'Unknown Store');
  };

  if (!isLoggedIn) {
    return renderNotLoggedIn();
  }

  return (
    <View style={[styles.wholePage, insideTabContainer && { paddingBottom: 50 }]}>
      <StoreSelectionModal visible={showStoreModal} onClose={handleStoreModalClose} />

      {/* Edit Recurring Order Modal */}
      <Modal
        visible={showEditRecurringModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditRecurringModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditRecurringModal(false)}>
                <Icon name="close" size={24} color="#222831" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Recurring Order</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Repeat every</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={styles.modalNumberInput}
                  value={editInterval}
                  onChangeText={setEditInterval}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <View style={styles.modalUnitButtons}>
                  {['week', 'month'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.modalUnitButton,
                        editUnit === unit && styles.modalUnitButtonActive,
                      ]}
                      onPress={() => setEditUnit(unit)}
                    >
                      <Text
                        style={[
                          styles.modalUnitButtonText,
                          editUnit === unit && styles.modalUnitButtonTextActive,
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Repeat on</Text>
              <View style={styles.modalDaysGrid}>
                {['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.modalDayButton,
                      editDays[day] && styles.modalDayButtonActive,
                    ]}
                    onPress={() => toggleEditDay(day)}
                  >
                    <Text
                      style={[
                        styles.modalDayButtonText,
                        editDays[day] && styles.modalDayButtonTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Ends</Text>
              {['never', 'on', 'after'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.modalRadioOption}
                  onPress={() => setEditEndType(type)}
                >
                  <View
                    style={[
                      styles.modalRadio,
                      editEndType === type && styles.modalRadioActive,
                    ]}
                  >
                    {editEndType === type && <View style={styles.modalRadioFill} />}
                  </View>
                  <Text style={styles.modalRadioLabel}>
                    {type === 'never' ? 'Never' : type === 'on' ? 'On date' : 'After N occurrences'}
                  </Text>
                  {type === 'on' && editEndType === 'on' && (
                    <TextInput
                      style={styles.modalDateInput}
                      value={editEndDate}
                      onChangeText={setEditEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                  {type === 'after' && editEndType === 'after' && (
                    <TextInput
                      style={styles.modalOccurrencesInput}
                      value={editOccurrences}
                      onChangeText={setEditOccurrences}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="13"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowEditRecurringModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveEditRecurringOrder}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileHeader}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {firstName && firstName[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{firstName}</Text>
              <Text style={styles.profileEmail}>{userEmail || 'Not available'}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Icon name="pencil-outline" size={20} color="#FF2E63" />
            </TouchableOpacity>
          </View>

          {/* Loyalty Points */}
          <View style={styles.loyaltyRow}>
            <View style={styles.loyaltyBadge}>
              <Text style={styles.loyaltyText}>⭐ 0 points</Text>
            </View>
            <Text style={styles.memberSince}>Member since March 2026</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBarContainer}
          >
            {Object.keys(TAB_LABELS).map((tabKey) => (
              <TouchableOpacity
                key={tabKey}
                style={[
                  styles.tabButton,
                  activeTab === tabKey && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab(tabKey)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === tabKey && styles.tabButtonTextActive,
                  ]}
                >
                  {TAB_LABELS[tabKey]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {activeTab === 'location' && renderLocationTab()}
        {activeTab === 'account' && renderAccountTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'recurring' && renderRecurringTab()}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* NavBar Spacing */}
        <View style={styles.navBarSpace} />
      </ScrollView>

      {!insideTabContainer && <NavBar />}
    </View>
  );
};

export default PreferencesPage;
