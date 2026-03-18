import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';

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
  const [email, setEmail] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
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

  // Handle continue with email for not-signed-in flow
  const handleContinueWithEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsCheckingEmail(true);
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/check-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();
      if (data.exists) {
        navigation.navigate('Auth', { email: trimmedEmail });
      } else {
        navigation.navigate('CreateAccount', { email: trimmedEmail });
      }
    } catch (error) {
      setEmailError('Network error. Please check your connection.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

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
    navigation.navigate('Auth');  // Navigate to the login page
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
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {name && <Text style={styles.greeting}>Hello {name}!</Text>}

            <SeasonalCarousel style={styles.carousel} />

            <View style={styles.generateSection}>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Based on My Preferences</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Try Something New</Text>
              </TouchableOpacity>
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
        <View style={styles.notSignedInContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.signInPrompt}>Sign in or create an account</Text>
          <TextInput
            style={[styles.emailInput, emailError ? styles.inputError : null]}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={(text) => { setEmail(text); setEmailError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryButton, isCheckingEmail && styles.primaryButtonDisabled]}
            onPress={handleContinueWithEmail}
            disabled={isCheckingEmail}
          >
            <Text style={styles.primaryButtonText}>
              {isCheckingEmail ? 'Checking...' : 'Continue with email'}
            </Text>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerLogo: {
    height: 32,
    width: 120,
  },
  heroLogo: {
    width: '70%',
    height: 120,
    marginBottom: 32,
  },
  signInPrompt: {
    fontSize: 16,
    color: '#222831',
    marginBottom: 24,
    textAlign: 'center',
  },
  emailInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#222831',
    marginBottom: 8,
    minHeight: 44,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    alignSelf: 'flex-start',
    marginBottom: 8,
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
  generateSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
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
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
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
