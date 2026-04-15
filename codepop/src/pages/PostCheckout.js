import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Button, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import RatingCarosel from '../components/RatingCarosel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseURL } from '../../ip_address';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../theme';

const PostCheckout = ({ onDone }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [lockerCombo, setLockerCombo] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [purchasedDrinks, setPurchasedDrinks] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isNearby, setIsNearby] = useState(false);
  const [orderNum, setOrderNum] = useState('');
  const [reviewText, setReviewText] = useState('');

  const DEFAULT_STORE = {
    latitude: 41.7421007,
    longitude: -111.8070335,
  };
  const [storeLocation, setStoreLocation] = useState(DEFAULT_STORE);

  useEffect(() => {
    (async () => {
      try {
        const latStr = await AsyncStorage.getItem('selectedStoreLatitude');
        const lonStr = await AsyncStorage.getItem('selectedStoreLongitude');
        const la = latStr != null ? parseFloat(latStr) : NaN;
        const lo = lonStr != null ? parseFloat(lonStr) : NaN;
        if (!Number.isNaN(la) && !Number.isNaN(lo)) {
          setStoreLocation({ latitude: la, longitude: lo });
        }
      } catch (e) {
        console.warn('PostCheckout: could not load store coordinates', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const appPref = await AsyncStorage.getItem('locationPermission');
      if (appPref !== 'granted') {
        setErrorMsg(
          'Location is off in your profile. Enable “Use My Location” or allow location when picking a store to use arrival detection.'
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(
          'Permission to access location was denied.\n Please click the button when you have arrived so we can have your drink prepared.'
        );
        return;
      }
      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    })();
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkDistance = (userCoords) => {
    const distance = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      storeLocation.latitude,
      storeLocation.longitude
    );
    setIsNearby(distance <= 457.2);
  };

  useEffect(() => {
    if (location) {
      const { coords } = location;
      checkDistance(coords);
    }
  }, [location, storeLocation]);



  // get the list of drinks from the cartlist
  useEffect(() => {
    const fetchPurchasedDrinks = async () => {
      try {
        const storedDrinks = await AsyncStorage.getItem("purchasedDrinks");
        const parsedDrinks = storedDrinks ? JSON.parse(storedDrinks) : [];
        setPurchasedDrinks(parsedDrinks);

        // Loop through the drinks and log details
        // Create a list to store all the items
        const allUsedItems = [];

        parsedDrinks.forEach((drink) => {

          // Add SyrupsUsed to the list
          if (drink.SyrupsUsed && drink.SyrupsUsed.length > 0) {
            allUsedItems.push(...drink.SyrupsUsed); // Spread operator to merge arrays
          }

          // Add SodaUsed to the list
          if (drink.SodaUsed && drink.SodaUsed.length > 0) {
            allUsedItems.push(...drink.SodaUsed);
          }

        // Add AddIns to the list
          if (drink.AddIns && drink.AddIns.length > 0) {
            allUsedItems.push(...drink.AddIns);
          }
    });

    // Fetch revenue data
    const inventoryResponse = await fetch(`${getBaseURL()}/backend/inventory/report/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const inventoryData = await inventoryResponse.json();

    // Extract matching InventoryIDs
    const matchingInventoryIDs = inventoryData.inventory_items.filter(item => allUsedItems.some(usedItem => usedItem.toLowerCase() === item.ItemName.toLowerCase())).map(item => item.InventoryID); // Extract the InventoryID

    for (const id of matchingInventoryIDs)
    {
      try{
        const data = {'used_quantity': 1};
        const response = await fetch(`${getBaseURL()}/backend/inventory/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update Inventory')
        }
      } catch (error) {
        console.error('Error resetting incentory:', error)
      }
    }
      } catch (error) {
        console.error("Error fetching purchased drinks:", error);
      }
    };
  
    fetchPurchasedDrinks();
  }, []);

  useEffect(() => {
    // Fetch orderNum from AsyncStorage
    const fetchOrderNum = async () => {
      const num = await AsyncStorage.getItem('orderNum');
      if (num) setOrderNum(num);
    };
    fetchOrderNum();
  }, []);

  useEffect(() => {
    // Generate locker combo only when the component mounts
    handleLockerCombo();
  }, []); // Empty dependency array ensures it runs only once

  useEffect(() => {
    if(lockerCombo !== ''){
      updateLockerCombo();
    }
  }, [lockerCombo]);

  useEffect(() => {
    // Start countdown timer
    if (timeLeft > 0 && isNearby) {
      const timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
  
      // Clear the interval when the timer reaches 0
      return () => clearInterval(timerId);
    }else{
      completeOrder();
    }
  }, [isNearby, timeLeft]);
  

  const completeOrder = async () => {
    const orderNum = await AsyncStorage.getItem("orderNum");
    await fetch(`${getBaseURL()}/backend/orders/${orderNum}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        OrderStatus: 'completed',
      }),
    });
  }
  

  const handleLockerCombo = () => {
    // Generate a random 5-digit locker combination
    let combo = '';
    for (let i = 0; i < 5; i++) {
      const digit = Math.floor(Math.random() * 10); // Generates a number between 0 and 9
      combo += digit.toString();
    }
    setLockerCombo(combo);
  };

  const updateLockerCombo = async () => {
    const orderNum = await AsyncStorage.getItem("orderNum");
    await fetch(`${getBaseURL()}/backend/orders/${orderNum}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        LockerCombo: lockerCombo,
      }),
    });
  };

  // Convert timeLeft to minutes and seconds format
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  // Function for the "I've Arrived" button
  const handleUserArrived = () => {
    setIsNearby(true);
  };

  const goHomePage = () => {
    if (onDone) {
      onDone();
    } else {
      navigation.navigate('GeneralHome', { initialTab: 0 });
    }
  };

  const makeDrink= () => {
    setIsNearby(true);
  }

  // Calculate price for a drink (same formula as PaymentPage)
  const calculatePrice = (drink) => {
    if (drink.Price == 2) {
      const syrupsCount = Array.isArray(drink.SyrupsUsed) ? drink.SyrupsUsed.length : 0;
      const addInsCount = Array.isArray(drink.AddIns) ? drink.AddIns.length : 0;
      return 2 + (syrupsCount + addInsCount) * 0.3;
    } else {
      return drink.Price;
    }
  };

  // Calculate totals for order summary
  const calculateTotals = () => {
    let subtotal = 0;
    purchasedDrinks.forEach(drink => {
      subtotal += calculatePrice(drink);
    });
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollViewContainer: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 30,
    },

    // Card styles
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    cardHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },

    // 1. Success Header
    successHeader: {
      alignItems: 'center',
    },
    successTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 12,
    },
    orderNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 8,
    },

    // 2. Status Banner
    statusBanner: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },

    // 3. Order Summary
    drinksList: {
      marginBottom: 16,
    },
    drinkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    drinkRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    drinkRowText: {
      marginLeft: 12,
      flex: 1,
    },
    drinkName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    drinkMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    drinkPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: 12,
    },
    priceBreakdown: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    priceValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },

    // 4. Pickup Info
    storeInfo: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 16,
    },
    storeLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    storeAddress: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    storeHours: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    etaSection: {
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    etaLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    etaTimer: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
    },
    mapContainer: {
      height: 200,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    map: {
      width: '100%',
      height: '100%',
    },
    arrivalButtonContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    arrivalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    arrivalButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    errorMessage: {
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    loadingText: {
      fontSize: 13,
      color: colors.textMuted,
    },

    // 5. Locker Code
    lockerCard: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    lockerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
      marginTop: -8,
    },
    lockerDisplayContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    lockerDisplay: {
      fontSize: 44,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 8,
      fontFamily: 'Courier New',
    },

    // 6. Receipt Actions
    receiptButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    ghostButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    ghostButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginTop: 4,
    },

    // 7. Order Tracking
    trackingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    comingSoonBadge: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    comingSoonText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    timelineContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    timelineItem: {
      flex: 1,
      alignItems: 'center',
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    timelineDotFilled: {
      backgroundColor: colors.primary,
    },
    timelineText: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
    },
    timelineTextActive: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    trackingNote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    // 9. Review
    reviewInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 13,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      textAlignVertical: 'top',
      marginBottom: 12,
      minHeight: 100,
    },

    // 10. Social Sharing
    socialButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    socialButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Bottom Buttons
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>

        {/* 1. Success Header Card */}
        <View style={styles.card}>
          <View style={styles.successHeader}>
            <Icon name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.orderNumber}>Order #{orderNum}</Text>
          </View>
        </View>

        {/* 2. Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: isNearby ? colors.primary : colors.secondary }]}>
          <Text style={styles.statusText}>
            {isNearby
              ? 'Your drink is being made!'
              : 'Head to the store — your drink will be ready when you arrive!'}
          </Text>
        </View>

        {/* 3. Order Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Order Summary</Text>

          <View style={styles.drinksList}>
            {purchasedDrinks.map((drink, idx) => (
              <View key={idx} style={styles.drinkRow}>
                <View style={styles.drinkRowLeft}>
                  <Icon name="cafe" size={20} color={colors.primary} />
                  <View style={styles.drinkRowText}>
                    <Text style={styles.drinkName}>{drink.Name || 'Custom Drink'}</Text>
                    {drink.SodaUsed && drink.SodaUsed.length > 0 && (
                      <Text style={styles.drinkMeta}>{drink.SodaUsed.join(', ')}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.drinkPrice}>${calculatePrice(drink).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax (8%)</Text>
              <Text style={styles.priceValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* 4. Pickup Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Pickup Details</Text>

          <View style={styles.storeInfo}>
            <Text style={styles.storeLabel}>CodePop — USU Location</Text>
            <Text style={styles.storeAddress}>4200 Old Main Hill, Logan, UT 84322</Text>
            <Text style={styles.storeHours}>Mon–Fri 8am–8pm, Sat–Sun 10am–6pm</Text>
          </View>

          <View style={styles.etaSection}>
            <Text style={styles.etaLabel}>Ready in:</Text>
            <Text style={styles.etaTimer}>{minutes}:{seconds}</Text>
          </View>

          {/* Map or Arrival Button */}
          <View style={styles.mapContainer}>
            {location ? (
              <MapView
                style={styles.map}
                region={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="You are here"
                  description="Current location"
                />
              </MapView>
            ) : (
              <View style={styles.arrivalButtonContainer}>
                {errorMsg ? (
                  <>
                    <Text style={styles.errorMessage}>{errorMsg}</Text>
                    <TouchableOpacity
                      style={styles.arrivalButton}
                      onPress={handleUserArrived}
                    >
                      <Text style={styles.arrivalButtonText}>I've Arrived</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.loadingText}>Loading location...</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* 5. Locker Code Card */}
        <View style={[styles.card, styles.lockerCard]}>
          <Text style={styles.cardHeading}>Your Pickup Code</Text>
          <Text style={styles.lockerSubtitle}>Enter this code at the cooler to unlock your drink</Text>
          <View style={styles.lockerDisplayContainer}>
            <Text style={styles.lockerDisplay}>{lockerCombo}</Text>
          </View>
        </View>

        {/* 6. Receipt Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Receipt</Text>
          <View style={styles.receiptButtonsRow}>
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            >
              <Icon name="print-outline" size={20} color={colors.primary} />
              <Text style={styles.ghostButtonText}>Print Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            >
              <Icon name="mail-outline" size={20} color={colors.primary} />
              <Text style={styles.ghostButtonText}>Email Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Order Tracking Card */}
        <View style={styles.card}>
          <View style={styles.trackingHeader}>
            <Text style={styles.cardHeading}>Order Tracking</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            {['Order Placed', 'Preparing', 'Ready for Pickup'].map((step, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={[styles.timelineDot, idx === 0 && styles.timelineDotFilled]} />
                <Text style={[styles.timelineText, idx === 0 && styles.timelineTextActive]}>{step}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.trackingNote}>Push notifications and live queue tracking are coming soon</Text>
        </View>

        {/* 8. Rate Your Drink Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Rate Your Drink</Text>
          <RatingCarosel purchasedDrinks={purchasedDrinks} />
        </View>

        {/* 9. Leave a Review Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Leave a Review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your thoughts about your drink..."
            placeholderTextColor={colors.textPlaceholder}
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              Alert.alert('Thanks!', 'Your review has been submitted.');
              setReviewText('');
            }}
          >
            <Text style={styles.primaryButtonText}>Submit Review</Text>
          </TouchableOpacity>
        </View>

        {/* 10. Share on Social Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Share Your Drink</Text>
          <View style={styles.socialButtonsRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Alert.alert('Coming Soon', 'Social sharing is coming soon! Use #socialdrinker')}
            >
              <Icon name="logo-instagram" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Alert.alert('Coming Soon', 'Social sharing is coming soon! Use #socialdrinker')}
            >
              <Icon name="logo-twitter" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Alert.alert('Coming Soon', 'Social sharing is coming soon! Use #socialdrinker')}
            >
              <Icon name="logo-facebook" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Buttons */}
        {!isNearby && timeLeft > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={makeDrink}
          >
            <Text style={styles.secondaryButtonText}>Location Not Working? Press to Start!</Text>
          </TouchableOpacity>
        )}

        {timeLeft === 0 && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goHomePage}
          >
            <Text style={styles.primaryButtonText}>Back to Home Page</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

    </View>
  );
};

export default PostCheckout;

