import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';
import { CodePopLogo } from '../components/CodePopLogo';
import StoreSelectionModal from '../components/StoreSelectionModal';
import DrinkNameModal from '../components/DrinkNameModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme';
import TabNavigationContext from '../context/TabNavigationContext';
import { getBaseURL } from '../../ip_address';

const GeneralHomePage = ({ insideTabContainer = false, isFocused = true, navigation: navProp }) => {
  const { colors } = useTheme();
  const hookNavigation = useNavigation();
  const isNavFocused = useIsFocused();
  const navigation = navProp ?? hookNavigation;
  const tabNav = useContext(TabNavigationContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [name, setName] = useState(null);
  const [showSizeSelector, setShowSizeSelector] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState(null);
  const [storePickerRequired, setStorePickerRequired] = useState(false);
  const [savedDrinks, setSavedDrinks] = useState([]);
  const [savedDrinksLoading, setSavedDrinksLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [drinkToRename, setDrinkToRename] = useState(null);

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
    tonicSingleButton: {
      flex: 1,
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    buttonContainer: {
      gap: 12,
    },
  });

  const styles = makeStyles(colors);

  // Fetch saved drinks for the user
  const fetchSavedDrinks = async (uid) => {
    setSavedDrinksLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${getBaseURL()}/backend/users/${uid}/drinks/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSavedDrinks(await res.json());
    } catch (e) {
      console.error('fetchSavedDrinks:', e);
    } finally {
      setSavedDrinksLoading(false);
    }
  };

  // Check login status and store selection when the screen gains focus
  useEffect(() => {
    if (!isFocused || !isNavFocused) return;
    let cancelled = false;

    const checkLoginStatus = async () => {
      try {
        const storedName = await AsyncStorage.getItem('first_name');
        const token = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');
        const selectedEndpoint = await AsyncStorage.getItem('selectedStoreEndpoint');
        const storeName = await AsyncStorage.getItem('selectedStoreName');
        const homeToken = await AsyncStorage.getItem('homeToken');
        const homeStoreEndpoint = await AsyncStorage.getItem('homeStoreEndpoint');
        const homeStoreId = await AsyncStorage.getItem('homeStoreId');

        console.log('DEBUG: Auth state:', { storedName, token, userRole, selectedEndpoint, homeToken, homeStoreEndpoint, homeStoreId });

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
          const uid = await AsyncStorage.getItem('userId');
          setUserId(uid);
          if (uid) fetchSavedDrinks(uid);
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
  }, [isFocused, isNavFocused]);

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
    if (tabNav && tabNav.navigateToTab) {
      tabNav.navigateToTab(1, { generateDrink: true }); // Navigate to Design tab and trigger generation
    } else {
      navigation.navigate('CreateDrink', {fromGenerateButton: true} );
    }
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

  const handleUnfavorite = async (drinkId) => {
    setSavedDrinks(prev => prev.filter(d => d.DrinkID !== drinkId)); // optimistic update
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${getBaseURL()}/backend/users/${userId}/favorites/${drinkId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ action: 'remove' }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch (e) {
      console.error('handleUnfavorite:', e);
      Alert.alert('Error', 'Could not remove drink. Please try again.');
      fetchSavedDrinks(userId); // restore on failure
    }
  };

  const handleRenameConfirm = async (name) => {
    setRenameModalVisible(false);
    if (!drinkToRename || !name.trim()) return;
    // Optimistic update
    setSavedDrinks(prev => prev.map(d =>
      d.DrinkID === drinkToRename.DrinkID ? { ...d, Name: name.trim() } : d
    ));
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${getBaseURL()}/backend/drinks/${drinkToRename.DrinkID}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ Name: name.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch (e) {
      console.error('handleRenameConfirm:', e);
      Alert.alert('Error', 'Could not rename drink. Please try again.');
      fetchSavedDrinks(userId); // revert on failure
    }
    setDrinkToRename(null);
  };

  const handleAddSavedDrinkToCart = async (drink, size) => {
    try {
      const res = await fetch(`${getBaseURL()}/backend/drinks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Name: drink.Name || 'Saved Drink',
          SodaUsed: drink.SodaUsed,
          SyrupsUsed: drink.SyrupsUsed || [],
          AddIns: drink.AddIns || [],
          Price: 2.00,
          User_Created: true,
          Size: size,
          Ice: drink.Ice || 'regular',
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const cartRaw = await AsyncStorage.getItem('checkoutList');
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      await AsyncStorage.setItem('checkoutList', JSON.stringify([...cart, data.DrinkID]));
      // Close size selector and navigate to cart
      setShowSizeSelector({});
      if (tabNav?.navigateToTab) tabNav.navigateToTab(2);
      else navigation.navigate('Cart');
    } catch (e) {
      console.error('handleAddSavedDrinkToCart:', e);
      Alert.alert('Error', 'Could not add to cart. Please try again.');
    }
  };

  const renderDrinkCard = (drink) => {
    const sizeChosen = selectedSize[drink.DrinkID];
    const sizeOpen = showSizeSelector[drink.DrinkID];
    const description = [
      ...(drink.SodaUsed || []),
      ...(drink.SyrupsUsed || []),
      ...(drink.AddIns || []),
    ].join(' + ');

    return (
      <View key={drink.DrinkID} style={styles.drinkCard}>
        <Text style={styles.drinkName}>{drink.Name || 'Custom Drink'}</Text>
        <Text style={styles.drinkDescription}>{description}</Text>

        <View style={styles.drinkActions}>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleUnfavorite(drink.DrinkID)}>
            <Icon name="heart-dislike-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setDrinkToRename(drink); setRenameModalVisible(true); }}
            style={[styles.secondaryButton, { flex: 0, paddingHorizontal: 10 }]}
          >
            <Icon name="pencil-outline" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleToggleSizeSelector(drink.DrinkID)}
          >
            <Text style={styles.primaryButtonText}>{sizeOpen ? 'Cancel' : 'Add to Cart'}</Text>
          </TouchableOpacity>
        </View>

        {sizeOpen && (
          <View style={styles.sizeSelector}>
            {['16oz', '24oz', '32oz'].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeOption,
                  sizeChosen === size && styles.sizeOptionSelected
                ]}
                onPress={() => handleSelectSize(drink.DrinkID, size)}
              >
                <Text style={[
                  styles.sizeOptionText,
                  sizeChosen === size && styles.sizeOptionSelectedText
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {sizeOpen && sizeChosen && (
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 8 }]}
            onPress={() => handleAddSavedDrinkToCart(drink, sizeChosen)}
          >
            <Text style={styles.primaryButtonText}>Confirm — {sizeChosen}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleStoreModalClose = async (meta) => {
    if (meta && meta.cancelled === false) {
      setStorePickerRequired(false);
    }
    setShowStoreModal(false);
    const storeName = await AsyncStorage.getItem('selectedStoreName');
    setSelectedStoreName(storeName);
  };

  const Root = insideTabContainer ? View : SafeAreaView;

  return (
    <Root style={styles.container}>
      <StoreSelectionModal
        visible={showStoreModal}
        onClose={handleStoreModalClose}
        requireSelection={storePickerRequired}
      />
      <DrinkNameModal
        visible={renameModalVisible}
        initialName={drinkToRename?.Name || ''}
        title="Rename Drink"
        onConfirm={handleRenameConfirm}
        onDismiss={() => { setRenameModalVisible(false); setDrinkToRename(null); }}
      />
      {isLoggedIn ? (
        <>
          {!insideTabContainer && (
            <View style={styles.customHeader}>
              <CodePopLogo size={32} />
            </View>
          )}
          <ScrollView contentContainerStyle={[styles.contentContainer, insideTabContainer && { paddingBottom: 50 }]}>
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
              <Text style={styles.tonicSectionSub}>Your AI bartender</Text>
              <View style={styles.tonicButtonRow}>
                <TouchableOpacity style={[styles.primaryButton, styles.tonicSingleButton]} onPress={generateDrinks}>
                  <Text style={styles.primaryButtonText}>Ask Tonic</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.savedDrinksSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.savedDrinksSectionTitle}>Saved Drinks</Text>
                {savedDrinksLoading && (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Loading…</Text>
                )}
              </View>

              {!savedDrinksLoading && savedDrinks.length === 0 && (
                <View style={{ padding: 16, backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                    No saved drinks yet. Create a drink and tap "Save" to add it here.
                  </Text>
                </View>
              )}

              {savedDrinks.map(drink => renderDrinkCard(drink))}
            </View>

            <View style={styles.buttonContainer}>
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
        <ScrollView contentContainerStyle={[styles.notSignedInContainer, insideTabContainer && { paddingBottom: 80 }]}>
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
      {!insideTabContainer && <NavBar />}
    </Root>
  );
};

export default GeneralHomePage;
