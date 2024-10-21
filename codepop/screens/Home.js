// screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar';   // Import NavBar

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Welcome to the Home Page</Text>   {/* Your content */}
      <NavBar />   {/* NavBar at the bottom or top, depending on design */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',     // Center vertically
    alignItems: 'center',          // Center horizontally
  },
});

export default HomeScreen;
