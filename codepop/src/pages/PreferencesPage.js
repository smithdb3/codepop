import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavBar from '../components/NavBar';
import { getBaseURL } from '../../ip_address';
import { useTheme } from '../theme';
import StoreSelectionModal from '../components/StoreSelectionModal';

const PreferencesPage = () => {
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode } = useTheme();

  // Auth & User State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userToken, setUserToken] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('location');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState('');

  // Account Settings Form States
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences & Privacy States
  const [notifOrderStatus, setNotifOrderStatus] = useState(true);
  const [notifPromo, setNotifPromo] = useState(true);
  const [notifNewItems, setNotifNewItems] = useState(false);
  const [notifPush, setNotifPush] = useState(true);

  // Load data on focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        await checkLoginStatus();
      };
      loadData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

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
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

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
  const handleSendVerification = () => {
    if (!newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    Alert.alert('Verification Email', 'Backend integration in progress');
  };

  const handleUpdatePassword = () => {
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
    Alert.alert('Update Password', 'Backend integration in progress');
  };

  const handleCancelEmailForm = () => {
    setNewEmail('');
    setShowChangeEmail(false);
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

      if (response.status === 200) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userEmail');

        Alert.alert(
          'Logout successful!',
          '',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('GeneralHome'),
            },
          ],
          { cancelable: false }
        );
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
  });

  const styles = makeStyles(colors);

  const renderNotLoggedIn = () => (
    <View style={styles.wholePage}>
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
      <NavBar />
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
      {/* Email Subsection */}
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Email</Text>
          <Text style={styles.settingValue}>{userEmail || 'Not available'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            handleCancelPasswordForm(); // close password form if open
            setShowChangeEmail(!showChangeEmail);
          }}
        >
          <Text style={styles.changeButtonText}>
            {showChangeEmail ? 'Cancel' : 'Change Email'}
          </Text>
        </TouchableOpacity>
      </View>

      {showChangeEmail && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.textInput}
            placeholder="New email address"
            placeholderTextColor={colors.textPlaceholder}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.formButtonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={handleSendVerification}
            >
              <Text style={styles.primaryButtonText}>Send Verification</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { flex: 1 }]}
              onPress={handleCancelEmailForm}
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
          handleCancelEmailForm(); // close email form if open
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

  const renderRecurringTab = () => (
    <>
      <View style={styles.card}>
        <View style={styles.emptyStateCard}>
          <Icon name="time-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No recurring orders yet</Text>
          <Text style={styles.emptyStateSubtitle}>Set up a recurring order at checkout</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, styles.ghostCard]}>
        <View style={styles.ghostCardHeader}>
          <Text style={styles.ghostCardLabel}>[EXAMPLE]</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Active</Text>
          </View>
        </View>
        <Text style={styles.ghostCardTitle}>Weekly Vanilla Latte</Text>
        <Text style={styles.ghostCardDetail}>Next charge: --</Text>
        <Text style={styles.ghostCardDetail}>Every Monday</Text>
        <View style={styles.ghostButtonRow}>
          {['View Details', 'Skip Next', 'Edit', 'Pause', 'Cancel'].map((action) => (
            <TouchableOpacity
              key={action}
              style={styles.ghostActionButton}
              onPress={() => Alert.alert('Coming Soon', 'Recurring orders are not yet available.')}
            >
              <Text style={styles.ghostActionButtonText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const handleStoreModalClose = async () => {
    setShowStoreModal(false);
    const storeName = await AsyncStorage.getItem('selectedStoreName');
    setSelectedStoreName(storeName || 'Unknown Store');
  };

  if (!isLoggedIn) {
    return renderNotLoggedIn();
  }

  return (
    <View style={styles.wholePage}>
      <StoreSelectionModal visible={showStoreModal} onClose={handleStoreModalClose} />
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

      <NavBar />
    </View>
  );
};

export default PreferencesPage;
