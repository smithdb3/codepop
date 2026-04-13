import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { getBaseURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// todo
  // test the removeAllDrinks function

export default function CheckoutForm(totalPrice, recurringConfig = null, onPaymentSuccess = null) {
  const navigation = useNavigation();
  const [drinks, setDrinks] = useState([]);
  const [stripeNum, setStripeNum] = useState(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    try {
      const url = `${getBaseURL()}/backend/create-payment-intent/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(totalPrice * 100) / 100 }), // amount in dollars, backend converts to cents
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      const { paymentIntent, ephemeralKey, customer } = data;

      if (!paymentIntent || !ephemeralKey || !customer) {
        throw new Error('Missing required payment fields from server');
      }

      setStripeNum(paymentIntent);
      return { paymentIntent, ephemeralKey, customer };
    } catch (error) {
      console.error('Error fetching payment sheet params:', error);
      throw error;
    }
  };

  const initializePaymentSheet = async () => {
    try {
      const { paymentIntent, ephemeralKey, customer } = await fetchPaymentSheetParams();
      const { error } = await initPaymentSheet({
        merchantDisplayName: "CodePop",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: true,
        returnURL: 'codepop://stripe-callback',
      });
      if (!error) setLoading(true);
      else Alert.alert("Error", error.message);
    } catch (error) {
      Alert.alert("Error", error.message || 'Failed to initialize payment sheet');
    }
  };

  // function to remove all drinks from cart list after sucessful checkout
  const removeAllDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');

      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(`${getBaseURL()}/backend/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          UserID: userId,
          Drinks: currentList,
          OrderStatus: 'processing',
          PaymentStatus: 'paid',
          StripeID: stripeNum,
        })
      });

      // Check if the request was successful
      if (response.ok) {
        const data = await response.json();
        const orderNum = data.OrderID;
        await AsyncStorage.setItem("orderNum", orderNum.toString());
      } else {
        console.error('Failed to create order:', response.status, await response.text());
      }

      // Update the local state to remove the drink from the cart page
      setDrinks(null);

      // Update the AsyncStorage to remove the drink ID from the checkout list
      await AsyncStorage.removeItem("checkoutList");
      
    } catch (error) {
      console.error('Error removing drinks from cart:', error);
    }
  };

  const addRevenue = async () => {
    try {
      const orderNum = await AsyncStorage.getItem("orderNum");
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${getBaseURL()}/backend/revenues/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          OrderID: orderNum,
          TotalAmount: Math.round(totalPrice * 100) / 100,
        }),
      });

      if (response.ok) {
        // Revenue recorded successfully
      } else {
        const errorMessage = await response.text(); // Retrieve error details
        console.error("Failed to record revenue:", response.status, errorMessage);
      }
    } catch (error) {
      console.error("Error occurred while recording revenue:", error);
    }
  };

  const saveRecurringOrder = async (drinks) => {
    if (!recurringConfig) return; // Skip if no recurring config provided

    try {
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');
      const currentList = drinks || [];

      // Date should already be in YYYY-MM-DD format from PaymentPage
      const formatDateForBackend = (dateStr) => {
        if (!dateStr || dateStr === '') return null;
        return dateStr; // Already in correct YYYY-MM-DD format
      };

      const response = await fetch(`${getBaseURL()}/backend/recurring-orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          user: userId,
          drinks: currentList,
          interval: recurringConfig.interval,
          unit: recurringConfig.unit,
          days: recurringConfig.days,
          end_type: recurringConfig.endType,
          end_date: formatDateForBackend(recurringConfig.endDate),
          occurrences: recurringConfig.occurrences,
          total_price: Math.round(totalPrice * 100) / 100,
          status: 'active',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to save recurring order:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error saving recurring order:', error);
    }
  };

  const openPaymentSheet = async () => {
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        console.error('Stripe error:', error);
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else {
        Alert.alert('Success', 'Your order is confirmed!', [
          {
            text: 'OK',
            onPress: async () => {
              const cartList = await AsyncStorage.getItem('checkoutList');
              const cartDrinks = cartList ? JSON.parse(cartList) : [];
              await removeAllDrinks();
              await addRevenue();
              await saveRecurringOrder(cartDrinks);
              const confirmedOrderNum = await AsyncStorage.getItem('orderNum');
              if (confirmedOrderNum) {
                await fetch(`${getBaseURL()}/backend/email/${confirmedOrderNum}/`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                });
              }
              if (onPaymentSuccess) {
                onPaymentSuccess();
              } else {
                navigation.navigate('PostCheckout');
              }
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Exception in openPaymentSheet:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}