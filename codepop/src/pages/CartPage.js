import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavBar from '../components/NavBar';
import { BASE_URL } from '../../ip_address';

const CartPage = () => {
  const navigation = useNavigation();
  const [groupedDrinks, setGroupedDrinks] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoSavings, setPromoSavings] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [savedDrinks, setSavedDrinks] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      fetchDrinks();
      loadSavedDrinks();
    }, [])
  );

  const loadSavedDrinks = async () => {
    try {
      const purchasedDrinksJson = await AsyncStorage.getItem('purchasedDrinks');
      if (purchasedDrinksJson) {
        const drinks = JSON.parse(purchasedDrinksJson);
        // Deduplicate by DrinkID and get unique drinks
        const uniqueDrinks = [];
        const seenIds = new Set();
        for (const drink of drinks) {
          if (!seenIds.has(drink.DrinkID)) {
            uniqueDrinks.push(drink);
            seenIds.add(drink.DrinkID);
          }
        }
        setSavedDrinks(uniqueDrinks.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Failed to load saved drinks:', error);
    }
  };

  const fetchDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];

      const fetchedDrinks = [];
      for (let i = 0; i < currentList.length; i++) {
        const response = await fetch(`${BASE_URL}/backend/drinks/${currentList[i]}/`, {
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
      calculatePrices(groupedArray);

      // Store full drink objects for purchased drinks
      await AsyncStorage.setItem('purchasedDrinks', JSON.stringify(fetchedDrinks));
    } catch (error) {
      console.error('Failed to get drinks:', error);
    }
  };

  const calculatePrice = (drink) => {
    if (drink.Price == 2) {
      const syrupsCount = Array.isArray(drink.SyrupsUsed) ? drink.SyrupsUsed.length : 0;
      const addInsCount = Array.isArray(drink.AddIns) ? drink.AddIns.length : 0;
      return 2 + (syrupsCount + addInsCount) * 0.3;
    } else {
      return drink.Price;
    }
  };

  const calculatePrices = (drinks) => {
    let sub = 0;
    drinks.forEach(({ drink, quantity }) => {
      sub += calculatePrice(drink) * quantity;
    });
    setSubtotal(sub);

    // Apply promo if active
    let final = sub;
    if (promoApplied) {
      final = sub * 0.9; // 10% discount
    }
    setTotalPrice(final);
  };

  const handleIncreaseQuantity = async (drinkId) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      currentList.push(drinkId); // Add one more occurrence
      await AsyncStorage.setItem('checkoutList', JSON.stringify(currentList));
      fetchDrinks();
    } catch (error) {
      console.error('Error increasing quantity:', error);
    }
  };

  const handleDecreaseQuantity = async (drinkId) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const index = currentList.indexOf(drinkId);
      if (index > -1) {
        currentList.splice(index, 1); // Remove one occurrence
        await AsyncStorage.setItem('checkoutList', JSON.stringify(currentList));
        fetchDrinks();
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    }
  };

  const handleRemoveDrink = async (drinkId) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');

      // Delete from backend if custom drink (ID > 6)
      if (drinkId > 6) {
        await fetch(`${BASE_URL}/backend/drinks/${drinkId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
        });
      }

      // Remove all occurrences from cart
      const updatedList = currentList.filter((item) => item !== drinkId);
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
      fetchDrinks();
    } catch (error) {
      console.error('Error removing drink:', error);
    }
  };

  const handleApplyPromo = () => {
    setPromoError('');
    if (promoCode === 'CODEPOP10') {
      setPromoApplied(true);
      const savings = subtotal * 0.1;
      setPromoSavings(savings);
      calculatePrices(groupedDrinks);
    } else {
      setPromoError('Invalid code');
      setPromoApplied(false);
    }
  };

  const handleAddSavedDrink = async (drink) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      currentList.push(drink.DrinkID);
      await AsyncStorage.setItem('checkoutList', JSON.stringify(currentList));
      fetchDrinks();
    } catch (error) {
      console.error('Error adding saved drink:', error);
    }
  };

  const renderDrinkCard = ({ item: { drink, quantity } }) => {
    const drinkPrice = calculatePrice(drink);

    return (
      <View style={styles.drinkCard}>
        <View style={styles.drinkContent}>
          <View style={styles.drinkIconBadge}>
            <Icon name="cafe" size={24} color="#FF2E63" />
          </View>

          <View style={styles.drinkInfo}>
            <Text style={styles.drinkName}>{drink.Name || 'Custom Drink'}</Text>
            <Text style={styles.drinkMeta}>
              {drink.Size} • {drink.Ice} ice • {(drink.SodaUsed || []).join(', ')}
            </Text>
            <Text style={styles.drinkPrice}>${drinkPrice.toFixed(2)} each</Text>
          </View>
        </View>

        <View style={styles.drinkActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UpdateDrink', { drink })}
            style={styles.editButton}
          >
            <Icon name="pencil" size={20} color="#222831" />
          </TouchableOpacity>

          <View style={styles.quantityRow}>
            <TouchableOpacity
              onPress={() => handleDecreaseQuantity(drink.DrinkID)}
              style={styles.qtyButton}
            >
              <Text style={styles.qtyButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => handleIncreaseQuantity(drink.DrinkID)}
              style={styles.qtyButton}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => handleRemoveDrink(drink.DrinkID)}
            style={styles.removeButton}
          >
            <Icon name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="cart-outline" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>Add a drink to get started</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('GeneralHome')}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Browse Drinks</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSavedDrinks = () => {
    if (savedDrinks.length === 0 || groupedDrinks.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick Add</Text>
        <FlatList
          horizontal
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          data={savedDrinks}
          keyExtractor={(item) => item.DrinkID.toString()}
          renderItem={({ item }) => (
            <View style={styles.savedDrinkCard}>
              <View style={styles.savedDrinkBadge}>
                <Icon name="cafe" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.savedDrinkName}>{item.Name || 'Custom'}</Text>
              <TouchableOpacity
                onPress={() => handleAddSavedDrink(item)}
                style={styles.addButton}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.savedDrinksContainer}
        />
      </View>
    );
  };

  return (
    <View style={styles.wholePage}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Your Cart</Text>
        </View>

        {groupedDrinks.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              scrollEnabled={false}
              data={groupedDrinks}
              keyExtractor={(item) => item.drink.DrinkID.toString()}
              renderItem={renderDrinkCard}
              contentContainerStyle={styles.drinksList}
            />

            {renderSavedDrinks()}

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (8.0%)</Text>
                <Text style={styles.summaryValue}>${(subtotal * 0.08).toFixed(2)}</Text>
              </View>
              {promoApplied && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.savingsText]}>
                    -${promoSavings.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
              </View>
            </View>

            {/* Promo Code */}
            <View style={styles.promoCard}>
              <Text style={styles.promoLabel}>Promo Code</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter code"
                  placeholderTextColor="#9CA3AF"
                  value={promoCode}
                  onChangeText={setPromoCode}
                />
                <TouchableOpacity
                  onPress={handleApplyPromo}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
              {promoApplied && (
                <Text style={styles.successText}>Saved ${promoSavings.toFixed(2)}!</Text>
              )}
              {promoError ? (
                <Text style={styles.errorText}>{promoError}</Text>
              ) : null}
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('payment')}
              style={styles.checkoutButton}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>

            <View style={styles.navBarSpace} />
          </>
        )}
      </ScrollView>

      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  wholePage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222831',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222831',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
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
  drinksList: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  drinkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  drinkContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  drinkIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFEEF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  drinkInfo: {
    flex: 1,
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222831',
  },
  drinkMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  drinkPrice: {
    fontSize: 14,
    color: '#222831',
    marginTop: 4,
  },
  drinkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    padding: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  qtyButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222831',
  },
  qtyText: {
    fontSize: 14,
    color: '#222831',
    marginHorizontal: 8,
  },
  removeButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  savedDrinksContainer: {
    paddingRight: 16,
  },
  savedDrinkCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  savedDrinkBadge: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#FF2E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedDrinkName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#222831',
    marginBottom: 8,
    maxWidth: 60,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF2E63',
    borderRadius: 50,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#222831',
    fontWeight: '500',
  },
  savingsText: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222831',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF2E63',
  },
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222831',
    marginBottom: 12,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222831',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#222831',
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  checkoutButton: {
    backgroundColor: '#FF2E63',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navBarSpace: {
    height: 80,
  },
});

export default CartPage;
