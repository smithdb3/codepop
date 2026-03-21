//import React from 'react';
//import { View, Text } from 'react-native';
//import NavBar from '../components/NavBar';
//
//const PaymentPage = () => {
//  return (
//    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//      <Text>Payment Page</Text>
//      <NavBar />
//    </View>
//  );
//};
//
//export default PaymentPage;
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';

const PaymentPage = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // 1. Get the total price from the route params (passed from Cart)
  // Ensure your Cart page passes { totalPrice: 200 } (in cents)
  const { totalPrice } = route.params || { totalPrice: 0 };

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  // 2. Talk to your backend to get the "keys" for this specific transaction
  const fetchPaymentSheetParams = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/create-payment-intent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice }),
      });
      const data = await response.json();
      return {
        paymentIntent: data.paymentIntent,
        ephemeralKey: data.ephemeralKey,
        customer: data.customer,
      };
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Could not connect to the payment server.");
    }
  };

  // 3. Set up the Stripe UI
  const initializePaymentSheet = async () => {
    const params = await fetchPaymentSheetParams();
    if (!params) return;

    const { error } = await initPaymentSheet({
      merchantDisplayName: "CodePop Soda Shop",
      customerId: params.customer,
      customerEphemeralKeySecret: params.ephemeralKey,
      paymentIntentClientSecret: params.paymentIntent,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: { name: 'Jane Doe' }
    });

    if (!error) {
      setLoading(true);
    } else {
      Alert.alert("Init Error", error.message);
    }
  };

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  // 4. Show the actual Stripe Credit Card form
  const handlePayPress = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error: ${error.code}`, error.message);
    } else {
      Alert.alert('Success', 'Your soda is on the way!', [
        { text: 'Sweet!', onPress: () => navigation.navigate('PostCheckout') }
      ]);
    }
  };

  return (
    // Put your actual Publishable Key here
    <StripeProvider publishableKey="pk_test_51TBSA2LNi1I4SwBPyjSHl60OyB7i7FxaWOwxB6DiBNyI9f2ptXQruNqr4OwFjRaVIUYEMOazEGYmvd9WDHLP4Nym00NF1WYdRj">
      <View style={styles.container}>
        <Text style={styles.header}>Checkout</Text>
        <Text style={styles.price}>Total: ${(totalPrice / 100).toFixed(2)}</Text>

        {loading ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayPress}>
            <Text style={styles.buttonText}>Pay Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color="#D30C7B" />
            <Text>Loading Payment Sheet...</Text>
          </View>
        )}

        <NavBar />
      </View>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFA686', alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  price: { fontSize: 32, marginVertical: 20, color: '#fff' },
  payButton: { backgroundColor: '#D30C7B', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  loadingArea: { alignItems: 'center' }
});

export default PaymentPage;