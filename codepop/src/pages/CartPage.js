import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CartPage = () => {
  const navigation = useNavigation();
  const [drinks, setDrinks] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchDrinks();
  }, []);

  const fetchDrinks = async () => {
    try {
      // gets list of cart drinkIDs from storage
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];

      const token = await AsyncStorage.getItem('userToken');

      setDrinks([]);

      for(let i = 0; i < currentList.length; i++){
        const response = await fetch(`${BASE_URL}/backend/drinks/${currentList[i]}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });
        const data = await response.json();
        if(data != null){
          setDrinks(drinks.push(data));
        }
        
      };

      for(let i = 0; i < drinks.length; i++){
        console.log(drinks[i].SyrupsUsed)
      }
      
    } catch (error) {
      console.error('Failed to get drinks: ', error);
    }
  };

  const calculatePrice = (drink) => {
    // $2 base price + $0.30 per ingredient
    return 2 + drink.ingredients.length * 0.3;
  };

  const calculateTotalPrice = (drinksList) => {
    const total = drinksList.reduce((sum, drink) => sum + calculatePrice(drink), 0);
    setTotalPrice(total.toFixed(2));
  };

  const removeDrink = async (drinkId) => {
    try {
      // deletes drink from database
      const response = await fetch(`${BASE_URL}/backend/drinks/${drinkId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
        },
    });

    // deltes it from being shown on the cart page
    setDrinks(drinks.filter(data => data.DrinkID !== drinkId));

    // delete it from phone storage
    const updatedList = currentList.filter(item => item !== drinkId);
    await AsyncStorage.setItem("checkoutList", updatedList);


    } catch (error) {
      console.error('Error removing drink:', error);
    }
  };

  const renderDrinkItem = ({ item }) => (
    <View style={styles.drinkContainer}>
      <Text style={styles.drinkText}>Drink: {item.soda_choice} with {item.size}, {item.ice_amount}</Text>
      <Text style={styles.ingredientsText}>Ingredients: {item.ingredients.join(', ')}</Text>
      <Text style={styles.priceText}>Price: ${calculatePrice(item)}</Text>

      <View style={styles.buttonRow}>
        {/* this button should change to navigate to the updateDrink Page eventually */}
        <TouchableOpacity onPress={() => navigation.navigate('CreateDrink', { editDrink: item })} style={styles.button}>
          <Icon name="create-outline" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => removeDrink(item.id)} style={styles.button}>
          <Icon name="close-circle-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Your Drinks</Text>

      <FlatList
        data={drinks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDrinkItem}
        contentContainerStyle={styles.listContainer}
      />

      <Text style={styles.totalText}>Cart Total: ${totalPrice}</Text>

      <TouchableOpacity onPress={() => navigation.navigate('payment')} style={styles.payButton}>
        <Icon name="card-outline" size={24} color="#fff" />
        <Text style={styles.payButtonText}>Pay Now</Text>
      </TouchableOpacity>

      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFA686',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  drinkContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  drinkText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ingredientsText: {
    fontSize: 16,
    marginTop: 5,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    padding: 10,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  payButton: {
    backgroundColor: '#D30C7B',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 80,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default CartPage;
