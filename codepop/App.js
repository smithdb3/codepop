import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import AuthPage from './src/pages/AuthPage';
import HomePage from './src/pages/HomePage';
import CartPage from './src/pages/CartPage';
import CreateDrinkPage from './src/pages/CreateDrinkPage';
import PreferencesPage from './src/pages/PreferencesPage';
import GeneralHomePage from './src/pages/GeneralHomePage';
import CreateAccountPage from './src/pages/CreateAccountPage';
import PaymentPage from './src/pages/PaymentPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const title = 'CodePop' 


const App = () => {
  // initialize cart list 
  const initCart = async () => {
    try{
      const checkoutList = await AsyncStorage.getItem('checkoutList')
      if (checkoutList === null){
        const initialList = [];
        await AsyncStorage.setItem("checkoutList", JSON.stringify(initialList));
      }
    }catch(error){
      console.error("error with initializing cart list", error);
    }
  };
  
  useEffect(() => {
    initCart()
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GeneralHome">
        <Stack.Screen 
          name="Auth" 
          component={AuthPage} 
        />
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountPage}
          options={{ title: 'Create Account'}}
        />
        <Stack.Screen 
          name="Home" 
          component={HomePage} 
          options={{ title: 'Home' }} 
        />
        <Stack.Screen
          name="Cart"
          component={CartPage}
          options={{ title: 'Cart' }}
        />
        <Stack.Screen
          name="CreateDrink"
          component={CreateDrinkPage}
          options={{ title: 'Create Drink' }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesPage}
          options={{ title: 'Preferences' }}
        />
        <Stack.Screen
          name="GeneralHome"
          component={GeneralHomePage}
          options={{ title: 'General Home' }}
        />
        <Stack.Screen
          name="payment"
          component={PaymentPage}
          options={{ title: 'Payment' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
