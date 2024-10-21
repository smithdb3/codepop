import React from 'react';
import { View, Text } from 'react-native';
import NavBar from '../components/NavBar';

const DrinkCreation = () => {
  return (
    <View style={{ flex: 1 }}>
      <Text>Home Screen</Text>
      <NavBar />   {/* Include NavBar here */}
    </View>
  );
};

export default DrinkCreation;