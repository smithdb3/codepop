import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';
import { CodePopLogo } from '../components/CodePopLogo';

const SAVED_DRINKS = [
  { id: 1, name: 'Cherry Fizz', description: 'Cherry syrup + lemon-lime soda', price: 4.99 },
  { id: 2, name: 'Mango Sunrise', description: 'Mango syrup + coconut water + cream soda', price: 5.49 },
  { id: 3, name: 'Mint Glacier', description: 'Mint syrup + club soda + blue raspberry', price: 4.75 },
];

const GeneralHomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [name, setName] = useState(null);
  const [showSizeSelector, setShowSizeSelector] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const navigation = useNavigation();

  // Check login status when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
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
    }, [])
  );

  // Logout function
  const handleLogout = async () => {
    try {
      // Send logout request to the backend
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/backend/auth/logout/`, {
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
    navigation.navigate('EmailCheck');  // Navigate to email check
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
                selectedSize[drink.id] === size && styles.sizeOptionTextSelected
              ]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoggedIn ? (
        <>
          <View style={styles.customHeader}>
            <CodePopLogo size={32} />
          </View>
          <ScrollView contentContainerStyle={styles.contentContainer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notSignedInLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222831',
    marginBottom: 24,
  },
  carousel: {
    marginBottom: 24,
  },
  tonicSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 32,
  },
  tonicSectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222831',
    marginBottom: 4,
  },
  tonicSectionSub: {
    fontSize: 13,
    color: '#6B7280',
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
    backgroundColor: '#FF2E63',
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  tonicGuestButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222831',
    marginBottom: 4,
  },
  tonicGuestButtonSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  carouselSection: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF2E63',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#222831',
    fontSize: 14,
    fontWeight: '600',
  },
  savedDrinksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222831',
    marginBottom: 16,
  },
  drinkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  drinkName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222831',
    marginBottom: 8,
  },
  drinkDescription: {
    fontSize: 12,
    color: '#222831',
    marginBottom: 8,
  },
  drinkPrice: {
    fontSize: 14,
    color: '#222831',
    marginBottom: 12,
    fontWeight: '600',
  },
  drinkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
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
  },
  sizeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: '#FF2E63',
    borderColor: '#FF2E63',
  },
  sizeOptionText: {
    fontSize: 12,
    color: '#222831',
    fontWeight: '600',
  },
  sizeOptionTextSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
});

export default GeneralHomePage;
