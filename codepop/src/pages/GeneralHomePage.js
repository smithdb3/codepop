import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getBaseURL } from '../../ip_address';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';
import { CodePopLogo } from '../components/CodePopLogo';
import StoreSelectionModal from '../components/StoreSelectionModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme';

const SAVED_DRINKS = [
  { id: 1, name: 'Cherry Fizz', description: 'Cherry syrup + lemon-lime soda', price: 4.99 },
  { id: 2, name: 'Mango Sunrise', description: 'Mango syrup + coconut water + cream soda', price: 5.49 },
  { id: 3, name: 'Mint Glacier', description: 'Mint syrup + club soda + blue raspberry', price: 4.75 },
];

const GeneralHomePage = () => {
  const { colors } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [name, setName] = useState(null);
  const [showSizeSelector, setShowSizeSelector] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState(null);
  const [storePickerRequired, setStorePickerRequired] = useState(false);
  const navigation = useNavigation();

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 100,
    },
    notSignedInContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 24,
      paddingTop: 64,
      paddingBottom: 100,
    },
    customHeader: {
      height: 56,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagline: {
      fontSize: 16,
      color: colors.textMuted,
      marginBottom: 8,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    notSignedInLabel: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 24,
      textAlign: 'center',
    },
    greeting: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 24,
    },
    carousel: {
      marginBottom: 24,
    },
    tonicSection: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 32,
    },
    tonicSectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    tonicSectionSub: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
    },
    tonicButtonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    logoBlock: {
      alignItems: 'center',
      marginBottom: 24,
    },
    signInButton: {
      width: 280,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    tonicGuestButton: {
      width: 280,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 32,
    },
    tonicGuestButtonLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    tonicGuestButtonSub: {
      fontSize: 12,
      color: colors.textMuted,
    },
    carouselSection: {
      alignSelf: 'stretch',
      marginTop: 8,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.surface2,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    drinkCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 16,
    },
    drinkName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    drinkDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 8,
    },
    drinkPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 12,
    },
    drinkActions: {
      flexDirection: 'row',
      gap: 8,
    },
    deleteButton: {
      flex: 0.3,
      backgroundColor: colors.error,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    sizeSelector: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    sizeOption: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
    },
    sizeOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sizeOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sizeOptionSelectedText: {
      color: '#FFFFFF',
    },
    savedDrinksSection: {
      marginBottom: 24,
    },
    savedDrinksSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    footerButton: {
      width: 280,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 100,
    },
    footerButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  const styles = makeStyles(colors);

  // Check login status and store selection when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
          const selectedEndpoint = await AsyncStorage.getItem('selectedStoreEndpoint');
          const storeName = await AsyncStorage.getItem('selectedStoreName');

          if (cancelled) return;

          if (!selectedEndpoint) {
            setStorePickerRequired(true);
            setShowStoreModal(true);
          } else {
            setStorePickerRequired(false);
            setSelectedStoreName(storeName);
          }

          if (token && storedName) {
            setIsLoggedIn(true);
            setName(storedName);
          } else {
            setIsLoggedIn(false);
          }
          if (userRole == 'admin'){
            setIsAdmin(true);
          }else if(userRole == 'manager'){
            setIsManager(true);
          }else{
            setIsAdmin(false);
            setIsManager(false);
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      };

      checkLoginStatus();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Logout function
  const handleLogout = async () => {
    try {
      // Send logout request to the backend
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${getBaseURL()}/backend/auth/logout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        
        setIsLoggedIn(false);
        setName(null);
        
        Alert.alert('Logout successful!');
      } else {
        Alert.alert('Logout failed, please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout failed, please try again later.');
    }
  };

  // Login button press
  const goToLoginPage = () => {
    navigation.navigate('Auth');
  };

  const goToAdminDash = () => {
    navigation.navigate('AdminDash');  // Navigate to the login page
  };

  const goToManDash = () => {
    navigation.navigate('ManagerDash');  // Navigate to the login page
  };

  // Generate drinks button press
  const generateDrinks = () => {
    console.log('generating drinks...');
    navigation.navigate('CreateDrink', {fromGenerateButton: true} );
  }

  const handleToggleSizeSelector = (drinkId) => {
    setShowSizeSelector(prev => ({
      ...prev,
      [drinkId]: !prev[drinkId]
    }));
  };

  const handleSelectSize = (drinkId, size) => {
    setSelectedSize(prev => ({
      ...prev,
      [drinkId]: size
    }));
  };

  const renderDrinkCard = (drink) => (
    <View key={drink.id} style={styles.drinkCard}>
      <Text style={styles.drinkName}>{drink.name}</Text>
      <Text style={styles.drinkDescription}>{drink.description}</Text>
      <Text style={styles.drinkPrice}>${drink.price}</Text>

      <View style={styles.drinkActions}>
        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleToggleSizeSelector(drink.id)}
        >
          <Text style={styles.primaryButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>

      {showSizeSelector[drink.id] && (
        <View style={styles.sizeSelector}>
          {['S', 'M', 'L'].map(size => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sizeOption,
                selectedSize[drink.id] === size && styles.sizeOptionSelected
              ]}
              onPress={() => handleSelectSize(drink.id, size)}
            >
              <Text style={[
                styles.sizeOptionText,
                selectedSize[drink.id] === size && styles.sizeOptionSelectedText
              ]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const handleStoreModalClose = async (meta) => {
    if (meta && meta.cancelled === false) {
      setStorePickerRequired(false);
    }
    setShowStoreModal(false);
    const storeName = await AsyncStorage.getItem('selectedStoreName');
    setSelectedStoreName(storeName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StoreSelectionModal
        visible={showStoreModal}
        onClose={handleStoreModalClose}
        requireSelection={storePickerRequired}
      />
      {isLoggedIn ? (
        <>
          <View style={styles.customHeader}>
            <CodePopLogo size={32} />
          </View>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {selectedStoreName && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surface2,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => {
                  setStorePickerRequired(false);
                  setShowStoreModal(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Shopping at ${selectedStoreName}`}
                accessibilityHint="Opens store picker to change location"
              >
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Shopping at</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon name="location-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{selectedStoreName}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}
            {name && <Text style={styles.greeting}>Hello {name}!</Text>}

            <SeasonalCarousel style={styles.carousel} />

            <View style={styles.tonicSection}>
              <Text style={styles.tonicSectionHeader}>Generate a Drink with Tonic</Text>
              <Text style={styles.tonicSectionSub}>Your AI bartender — choose how it creates your drink</Text>
              <View style={styles.tonicButtonRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={generateDrinks}>
                  <Text style={styles.primaryButtonText}>Based on My{'\n'}Preferences</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Try Something{'\n'}New</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.savedDrinksSection}>
              <Text style={styles.sectionTitle}>Saved Drinks</Text>
              {SAVED_DRINKS.map(drink => renderDrinkCard(drink))}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleLogout} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Logout</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity onPress={goToAdminDash} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Admin Dash</Text>
                </TouchableOpacity>
              )}
              {isManager && (
                <TouchableOpacity onPress={goToManDash} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Manager Dash</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.notSignedInContainer}>
          {/* Logo at top */}
          <View style={styles.logoBlock}>
            <CodePopLogo size={64} />
          </View>

          <Text style={styles.tagline}>Your custom drink, your way.</Text>
          <Text style={styles.notSignedInLabel}>You are not signed in.</Text>

          {/* Sign In — primary, centered */}
          <TouchableOpacity style={styles.signInButton} onPress={goToLoginPage}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Tonic AI generate button */}
          <TouchableOpacity style={styles.tonicGuestButton} onPress={generateDrinks}>
            <Text style={styles.tonicGuestButtonLabel}>Generate a Drink</Text>
            <Text style={styles.tonicGuestButtonSub}>Powered by Tonic, your AI bartender</Text>
          </TouchableOpacity>

          {/* Seasonal carousel — read-only */}
          <View style={styles.carouselSection}>
            <Text style={styles.sectionTitle}>Seasonal Drinks</Text>
            <SeasonalCarousel readOnly={true} />
          </View>
        </ScrollView>
      )}
      <NavBar />
    </SafeAreaView>
  );
};

export default GeneralHomePage;
