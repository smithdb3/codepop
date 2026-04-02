import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavBar from '../components/NavBar';
import CheckoutForm from './CheckoutForm';
import { getBaseURL } from '../../ip_address';
import { useTheme } from '../theme';

const PaymentPage = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Order data
  const [groupedDrinks, setGroupedDrinks] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [promoSavings, setPromoSavings] = useState(0);

  // Pickup & timing
  const [pickupMethod, setPickupMethod] = useState('geolocation');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [saveCard, setSaveCard] = useState(false);

  // Recurring order
  const [isRecurring, setIsRecurring] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState('1');
  const [recurringUnit, setRecurringUnit] = useState('week');
  const [recurringDays, setRecurringDays] = useState({ S: false, M: false, T: false, W: false, Th: false, F: false, Sa: false });
  const [recurringEndType, setRecurringEndType] = useState('never'); // 'never', 'on', 'after'
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringOccurrences, setRecurringOccurrences] = useState('13');

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Checkout map / selected store
  const [checkoutStoreName, setCheckoutStoreName] = useState('CodePop');
  const [storeMapLat, setStoreMapLat] = useState(null);
  const [storeMapLon, setStoreMapLon] = useState(null);
  const [checkoutLocationPref, setCheckoutLocationPref] = useState(null);

  // Stripe
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const { initializePaymentSheet, openPaymentSheet, loading: paymentSheetReady } = CheckoutForm(totalPrice);

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const response = await fetch(`${getBaseURL()}/backend/config/stripe/`);
        const data = await response.json();
        setStripePublishableKey(data.publishableKey);
      } catch (e) {
        console.error('Failed to fetch Stripe publishable key:', e);
      }
    };
    fetchStripeKey();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDrinks();
      setError('');
      setRetryCount(0);
      // Set default recurring end date to 3 months from now
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      setRecurringEndDate(futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

      (async () => {
        try {
          const name = await AsyncStorage.getItem('selectedStoreName');
          const latStr = await AsyncStorage.getItem('selectedStoreLatitude');
          const lonStr = await AsyncStorage.getItem('selectedStoreLongitude');
          const perm = await AsyncStorage.getItem('locationPermission');
          if (name) setCheckoutStoreName(name);
          const la = latStr != null ? parseFloat(latStr) : NaN;
          const lo = lonStr != null ? parseFloat(lonStr) : NaN;
          setStoreMapLat(!Number.isNaN(la) ? la : null);
          setStoreMapLon(!Number.isNaN(lo) ? lo : null);
          setCheckoutLocationPref(perm);
          if (perm === 'granted') {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              setCheckoutLocationPref('denied');
            }
          }
        } catch (e) {
          console.warn('Checkout map: failed to load store/location prefs', e);
        }
      })();
    }, [])
  );

  useEffect(() => {
    if (totalPrice > 0) {
      initializePaymentSheet();
    }
  }, [totalPrice]);

  const calculatePrice = (drink) => {
    if (drink.Price == 2) {
      const syrupsCount = Array.isArray(drink.SyrupsUsed) ? drink.SyrupsUsed.length : 0;
      const addInsCount = Array.isArray(drink.AddIns) ? drink.AddIns.length : 0;
      return 2 + (syrupsCount + addInsCount) * 0.3;
    } else {
      return drink.Price;
    }
  };

  const fetchDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const promoDataStr = await AsyncStorage.getItem('promoData');
      const promoData = promoDataStr ? JSON.parse(promoDataStr) : { promoApplied: false, promoSavings: 0 };

      const fetchedDrinks = [];
      for (let i = 0; i < currentList.length; i++) {
        const response = await fetch(`${getBaseURL()}/backend/drinks/${currentList[i]}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data != null && data.Size && data.SodaUsed && data.Ice) {
          fetchedDrinks.push(data);
        }
      }

      // Group drinks by DrinkID and count quantities
      const grouped = {};
      fetchedDrinks.forEach((drink) => {
        if (!grouped[drink.DrinkID]) {
          grouped[drink.DrinkID] = { drink, quantity: 0 };
        }
        grouped[drink.DrinkID].quantity += 1;
      });

      const groupedArray = Object.values(grouped);
      setGroupedDrinks(groupedArray);

      // Calculate prices
      let sub = 0;
      groupedArray.forEach(({ drink, quantity }) => {
        sub += calculatePrice(drink) * quantity;
      });
      setSubtotal(sub);

      const final = sub * (promoData.promoApplied ? 0.9 : 1);
      setPromoSavings(promoData.promoSavings || 0);
      setTotalPrice(final);

      await AsyncStorage.setItem('purchasedDrinks', JSON.stringify(fetchedDrinks));
    } catch (error) {
      console.error('Failed to get drinks:', error);
    }
  };

  const handleRecurringToggle = (value) => {
    setIsRecurring(value);
    if (value) {
      setShowRecurringModal(true);
    }
  };

  const toggleDay = (day) => {
    setRecurringDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleRecurringConfirm = () => {
    setShowRecurringModal(false);
  };

  const handleRecurringCancel = () => {
    setIsRecurring(false);
    setShowRecurringModal(false);
  };

  const handlePayNow = async () => {
    setLoading(true);
    try {
      await initializePaymentSheet();
      await openPaymentSheet();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment declined. Please try again or use a different card.');
      setRetryCount(retryCount + 1);
      if (retryCount >= 2) {
        // After 3 attempts, show only support link
      }
    } finally {
      setLoading(false);
    }
  };

  const tax = subtotal * 0.08;
  const total = totalPrice + tax;

  const makeStyles = (colors) => StyleSheet.create({
    wholePage: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },

    // Card styles
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 16,
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

    // A. Order Summary
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
    },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    storeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: 8,
    },
    mapPlaceholder: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: colors.background,
    },
    mapPlaceholderText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    checkoutMapBox: {
      height: 180,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: colors.background,
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
    savingsText: {
      color: colors.success,
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

    // B. Pickup Timing
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    toggleButtonTextActive: {
      color: '#FFFFFF',
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    infoBoxText: {
      fontSize: 13,
      color: colors.textPrimary,
      marginLeft: 8,
      fontWeight: '500',
    },
    infoBoxSubtext: {
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 8,
    },

    // C. Payment Method
    paymentOption: {
      marginBottom: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: colors.primary,
      backgroundColor: '#FFEEF1',
    },
    radioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    paymentLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: 12,
    },
    paymentSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    stripeBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: colors.background,
      marginVertical: 12,
    },
    stripeBoxText: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },
    securityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    securityText: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 8,
    },

    // D. Save Card
    saveCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    saveCardLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    privacyLink: {
      fontSize: 12,
      color: colors.secondary,
      fontWeight: '500',
    },

    // E. Recurring Order
    recurringRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    recurringLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    recurringDetails: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    recurringDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    recurringDetailLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    editLink: {
      fontSize: 13,
      color: colors.secondary,
      fontWeight: '600',
    },

    // F. Error Display
    errorCard: {
      backgroundColor: '#FEE2E2',
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 8,
      padding: 16,
      marginTop: 16,
    },
    errorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      fontWeight: '600',
      marginLeft: 8,
    },
    errorAttempt: {
      fontSize: 12,
      color: colors.error,
      marginBottom: 8,
    },
    contactLink: {
      fontSize: 12,
      color: colors.secondary,
      fontWeight: '600',
    },

    // G. Pay Button
    payButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 16,
    },
    payButtonDisabled: {
      opacity: 0.6,
    },
    payButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    supportLink: {
      fontSize: 14,
      color: colors.secondary,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: 12,
    },

    navBarSpace: {
      height: 80,
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 24,
      paddingBottom: 32,
    },
    modalHeading: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    modalDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    modalSection: {
      marginBottom: 20,
    },
    modalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    repeatEveryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    repeatInput: {
      width: 50,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    unitPicker: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
    },
    unitOption: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    unitOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    unitOptionText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    unitOptionTextActive: {
      color: '#FFFFFF',
    },
    daySelector: {
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'space-between',
    },
    dayButton: {
      flex: 1,
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    dayButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dayButtonTextActive: {
      color: '#FFFFFF',
    },
    endOption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    endOptionContent: {
      flex: 1,
      marginLeft: 12,
    },
    endOptionText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    endDateInput: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.textPrimary,
    },
    occurrencesInput: {
      width: 50,
      marginTop: 8,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    occurrencesLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButtonPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    modalButtonSecondary: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSecondaryText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  const styles = makeStyles(colors);

  if (!stripePublishableKey) {
    return (
      <View style={styles.wholePage}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <View style={styles.wholePage}>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* A. Order Review Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Order Summary</Text>

            {/* Drink items */}
            <View style={styles.drinksList}>
              {groupedDrinks.map(({ drink, quantity }) => (
                <View key={drink.DrinkID} style={styles.drinkRow}>
                  <View style={styles.drinkRowLeft}>
                    <Icon name="cafe" size={20} color={colors.primary} />
                    <View style={styles.drinkRowText}>
                      <Text style={styles.drinkName}>{drink.Name || 'Custom Drink'}</Text>
                      <Text style={styles.drinkMeta}>×{quantity}</Text>
                    </View>
                  </View>
                  <Text style={styles.drinkPrice}>${(calculatePrice(drink) * quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Store info */}
            <View style={styles.storeRow}>
              <Icon name="location" size={18} color={colors.textPrimary} />
              <Text style={styles.storeText}>{checkoutStoreName}</Text>
            </View>

            {storeMapLat != null && storeMapLon != null ? (
              <View style={styles.checkoutMapBox}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: storeMapLat,
                    longitude: storeMapLon,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                  }}
                  showsUserLocation={checkoutLocationPref === 'granted'}
                >
                  <Marker
                    coordinate={{ latitude: storeMapLat, longitude: storeMapLon }}
                    title={checkoutStoreName}
                  />
                </MapView>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>
                  Store location unavailable. Choose a store from the home or profile screen to see it on the map.
                </Text>
              </View>
            )}

            {/* Price breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>${subtotal.toFixed(2)}</Text>
              </View>
              {promoSavings > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount</Text>
                  <Text style={[styles.priceValue, styles.savingsText]}>-${promoSavings.toFixed(2)}</Text>
                </View>
              )}
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

          {/* B. Pickup Timing Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Pickup Options</Text>

            {/* Toggle between geolocation and scheduled */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setPickupMethod('geolocation')}
                style={[
                  styles.toggleButton,
                  pickupMethod === 'geolocation' && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    pickupMethod === 'geolocation' && styles.toggleButtonTextActive,
                  ]}
                >
                  Use My Location
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPickupMethod('scheduled')}
                style={[
                  styles.toggleButton,
                  pickupMethod === 'scheduled' && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    pickupMethod === 'scheduled' && styles.toggleButtonTextActive,
                  ]}
                >
                  Schedule Time
                </Text>
              </TouchableOpacity>
            </View>

            {/* Geolocation message */}
            {pickupMethod === 'geolocation' && (
              <View style={styles.infoBox}>
                <Icon name="time" size={16} color={colors.textPrimary} />
                <Text style={styles.infoBoxText}>Estimated pickup: ~8 minutes from now</Text>
              </View>
            )}

            {/* Scheduled message */}
            {pickupMethod === 'scheduled' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>Pickup at: [time]</Text>
                <Text style={styles.infoBoxSubtext}>Backend ETA coming soon</Text>
              </View>
            )}
          </View>

          {/* C. Payment Method Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Payment Method</Text>

            {/* Card option */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('card')}
              style={styles.paymentOption}
            >
              <View style={styles.radioOption}>
                <View style={[styles.radioCircle, paymentMethod === 'card' && styles.radioSelected]}>
                  {paymentMethod === 'card' && <View style={styles.radioDot} />}
                </View>
                <Icon name="card" size={20} color={colors.textPrimary} />
                <Text style={styles.paymentLabel}>Credit / Debit Card</Text>
              </View>
            </TouchableOpacity>

            {/* Apple Pay option */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('applepay')}
              style={styles.paymentOption}
            >
              <View style={styles.radioOption}>
                <View style={[styles.radioCircle, paymentMethod === 'applepay' && styles.radioSelected]}>
                  {paymentMethod === 'applepay' && <View style={styles.radioDot} />}
                </View>
                <Icon name="logo-apple" size={20} color={colors.textPrimary} />
                <Text style={styles.paymentLabel}>Apple Pay / Google Pay</Text>
              </View>
            </TouchableOpacity>

            {/* Saved cards option */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('saved')}
              style={styles.paymentOption}
            >
              <View style={styles.radioOption}>
                <View style={[styles.radioCircle, paymentMethod === 'saved' && styles.radioSelected]}>
                  {paymentMethod === 'saved' && <View style={styles.radioDot} />}
                </View>
                <Icon name="save" size={20} color={colors.textPrimary} />
                <View>
                  <Text style={styles.paymentLabel}>Saved Cards</Text>
                  <Text style={styles.paymentSub}>(Coming soon)</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Stripe placeholder message */}
            {paymentMethod === 'card' && (
              <View style={styles.stripeBox}>
                <Text style={styles.stripeBoxText}>
                  Stripe payment form not yet implemented — tap 'Pay Now' to use Stripe's secure payment sheet
                </Text>
              </View>
            )}

            {/* Security indicators */}
            <View style={styles.securityRow}>
              <Icon name="lock-closed" size={16} color={colors.textPrimary} />
              <Text style={styles.securityText}>Secure payment powered by Stripe</Text>
            </View>
            <View style={styles.securityRow}>
              <Text style={styles.securityText}>Your card info is never stored on our servers</Text>
            </View>
          </View>

          {/* D. Save Card Row (conditional) */}
          {paymentMethod === 'card' && (
            <View style={styles.card}>
              <View style={styles.saveCardRow}>
                <Text style={styles.saveCardLabel}>Save this card for future orders</Text>
                <Switch
                  value={saveCard}
                  onValueChange={setSaveCard}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={saveCard ? colors.primary : '#FFFFFF'}
                />
              </View>
              <TouchableOpacity>
                <Text style={styles.privacyLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* E. Recurring Order Toggle */}
          <View style={styles.card}>
            <View style={styles.recurringRow}>
              <Text style={styles.recurringLabel}>Make this a recurring order</Text>
              <Switch
                value={isRecurring}
                onValueChange={handleRecurringToggle}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={isRecurring ? colors.primary : '#FFFFFF'}
              />
            </View>

            {isRecurring && (
              <View style={styles.recurringDetails}>
                <View style={styles.recurringDetailRow}>
                  <Text style={styles.recurringDetailLabel}>Custom recurrence set</Text>
                  <TouchableOpacity onPress={() => setShowRecurringModal(true)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* F. Error Display (conditional) */}
          {error && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Icon name="warning" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <Text style={styles.errorAttempt}>Attempt {retryCount} of 3</Text>
              {retryCount >= 3 ? (
                <TouchableOpacity>
                  <Text style={styles.contactLink}>Contact Support</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* G. Pay Now Button */}
          {!(retryCount >= 3) && (
            <TouchableOpacity
              onPress={handlePayNow}
              disabled={loading || !paymentSheetReady}
              style={[styles.payButton, (loading || !paymentSheetReady) && styles.payButtonDisabled]}
            >
              {(loading || !paymentSheetReady) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>Pay Now · ${total.toFixed(2)}</Text>
              )}
            </TouchableOpacity>
          )}

          {retryCount >= 3 && (
            <TouchableOpacity>
              <Text style={styles.supportLink}>Contact Support</Text>
            </TouchableOpacity>
          )}

          <View style={styles.navBarSpace} />
        </ScrollView>

        <NavBar />

        {/* Recurring Order Modal */}
        <Modal
          visible={showRecurringModal}
          transparent
          animationType="slide"
          onRequestClose={handleRecurringCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalHeading}>CUSTOM RECURRENCE</Text>
              <View style={styles.modalDivider} />

              {/* Repeat every */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Repeat every:</Text>
                <View style={styles.repeatEveryRow}>
                  <TextInput
                    style={styles.repeatInput}
                    value={recurringInterval}
                    onChangeText={setRecurringInterval}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholderTextColor={colors.textPlaceholder}
                  />
                  <View style={styles.unitPicker}>
                    <TouchableOpacity
                      onPress={() => setRecurringUnit('week')}
                      style={[styles.unitOption, recurringUnit === 'week' && styles.unitOptionActive]}
                    >
                      <Text style={[styles.unitOptionText, recurringUnit === 'week' && styles.unitOptionTextActive]}>
                        week
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setRecurringUnit('month')}
                      style={[styles.unitOption, recurringUnit === 'month' && styles.unitOptionActive]}
                    >
                      <Text style={[styles.unitOptionText, recurringUnit === 'month' && styles.unitOptionTextActive]}>
                        month
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Day selector */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Repeat on:</Text>
                <View style={styles.daySelector}>
                  {['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[styles.dayButton, recurringDays[day] && styles.dayButtonActive]}
                    >
                      <Text style={[styles.dayButtonText, recurringDays[day] && styles.dayButtonTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ends section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Ends:</Text>

                {/* Never option */}
                <TouchableOpacity
                  onPress={() => setRecurringEndType('never')}
                  style={styles.endOption}
                >
                  <View style={[styles.radioCircle, recurringEndType === 'never' && styles.radioSelected]}>
                    {recurringEndType === 'never' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.endOptionText}>Never</Text>
                </TouchableOpacity>

                {/* On date option */}
                <TouchableOpacity
                  onPress={() => setRecurringEndType('on')}
                  style={styles.endOption}
                >
                  <View style={[styles.radioCircle, recurringEndType === 'on' && styles.radioSelected]}>
                    {recurringEndType === 'on' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.endOptionContent}>
                    <Text style={styles.endOptionText}>On:</Text>
                    {recurringEndType === 'on' && (
                      <TextInput
                        style={styles.endDateInput}
                        value={recurringEndDate}
                        onChangeText={setRecurringEndDate}
                        placeholder="Feb 14, 2026"
                        placeholderTextColor={colors.textPlaceholder}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* After X occurrences option */}
                <TouchableOpacity
                  onPress={() => setRecurringEndType('after')}
                  style={styles.endOption}
                >
                  <View style={[styles.radioCircle, recurringEndType === 'after' && styles.radioSelected]}>
                    {recurringEndType === 'after' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.endOptionContent}>
                    <Text style={styles.endOptionText}>After:</Text>
                    {recurringEndType === 'after' && (
                      <TextInput
                        style={styles.occurrencesInput}
                        value={recurringOccurrences}
                        onChangeText={setRecurringOccurrences}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="13"
                        placeholderTextColor={colors.textPlaceholder}
                      />
                    )}
                    {recurringEndType === 'after' && (
                      <Text style={styles.occurrencesLabel}>occurrences</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.modalDivider} />

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={handleRecurringCancel} style={styles.modalButtonSecondary}>
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRecurringConfirm} style={styles.modalButtonPrimary}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </StripeProvider>
  );
};

export default PaymentPage;
