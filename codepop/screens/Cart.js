// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, Button } from 'react-native';
import NavBar from '../components/NavBar';

const Cart = ({ navigation }) => {
  return (
    <View>
      <Text>Welcome to cart Screen</Text>
      <NavBar />
    </View>
  );
};

export default Cart;