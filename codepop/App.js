//import AsyncStorage from '@react-native-async-storage/async-storage';
//import { NavigationContainer, useNavigation } from '@react-navigation/native';
//import { createNativeStackNavigator } from '@react-navigation/native-stack';
//import * as Font from 'expo-font';
//import React, { useEffect } from 'react';
//import { TouchableOpacity, StyleSheet, Text, Alert} from 'react-native';
//import Icon from 'react-native-vector-icons/Ionicons';
//import AdminDash from './src/pages/AdminDash';
//import AuthPage from './src/pages/AuthPage';
//import CartPage from './src/pages/CartPage';
//import CheckoutForm from './src/pages/CheckoutForm';
//import ComplaintsPage from './src/pages/ComplaintsPage';
//import CompletePage from './src/pages/CompletePage';
//import CreateAccountPage from './src/pages/CreateAccountPage';
//import CreateDrinkPage from './src/pages/CreateDrinkPage';
//import GeneralHomePage from './src/pages/GeneralHomePage';
//import ManagerDash from './src/pages/ManagerDash';
//import PaymentPage from './src/pages/PaymentPage';
//import PostCheckout from './src/pages/PostCheckout';
//import PreferencesPage from './src/pages/PreferencesPage';
//import UpdateDrink from './src/pages/UpdateDrink';
//import { BASE_URL } from './ip_address';
//
//const Stack = createNativeStackNavigator();
//const title = 'CodePop'
//
//
//const App = () => {
//  // initialize cart list
//  const initCart = async () => {
//    try{
//      const checkoutList = await AsyncStorage.getItem('checkoutList')
//      if (checkoutList === null){
//        const initialList = [];
//        await AsyncStorage.setItem("checkoutList", JSON.stringify(initialList));
//      }
//    }catch(error){
//      console.error("error with initializing cart list", error);
//    }
//  };
//
//  useEffect(() => {
//    initCart()
//  }, []);
//  useEffect(() => {
//    const loadFonts = async () => {
//        await Font.loadAsync({
//            'CherryBombOne': require('./assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
//        });
//    };
//
//    loadFonts();
//  }, []);
//
//  return (
//    <NavigationContainer>
//      <Stack.Navigator initialRouteName="GeneralHome" screenOptions={{headerStyle: {backgroundColor: '#c8c8ee'}}}>
//        <Stack.Screen
//          name="Auth"
//          component={AuthPage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//          },}}
//        />
//        <Stack.Screen
//          name="CreateAccount"
//          component={CreateAccountPage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//          },}}
//        />
//        <Stack.Screen
//          name="Cart"
//          component={CartPage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//          },}}
//        />
//        <Stack.Screen
//          name="CreateDrink"
//          component={CreateDrinkPage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//          },}}
//
//        />
//        <Stack.Screen
//          name="ComplaintsPage"
//          component={ComplaintsPage}
//          options={{ title: 'ComplaintsPage' }}
//        />
//        <Stack.Screen
//          name="Preferences"
//          component={PreferencesPage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//            },}}
//        />
//        <Stack.Screen
//          name="GeneralHome"
//          component={GeneralHomePage}
//          options={{
//            title: title,
//            headerTitleStyle: {
//              // fontFamily: 'CherryBombOne',
//            },
//            headerRight: () => (
//              <ProfileButton />
//            ),}}
//        />
//        <Stack.Screen
//          name="payment"
//          component={PaymentPage}
//          options={{ title: 'Payment' }}
//        />
//        <Stack.Screen
//          name="UpdateDrink"
//          component={UpdateDrink}
//          options={{ title: 'UpdateDrink' }}
//        />
//        <Stack.Screen
//          name="ManagerDash"
//          component={ManagerDash}
//          options={{ title: 'ManagerDash', headerRight: () => (<LogoutButton />) }}
//        />
//        <Stack.Screen
//          name="AdminDash"
//          component={AdminDash}
//          options={{ title: 'AdminDash', headerRight: () => (<LogoutButton />) }}
//        />
//        <Stack.Screen
//          name="Complete"
//          component={CompletePage}
//          options={{ title: 'Complete' }}
//        />
//        <Stack.Screen
//          name="Checkout"
//          component={CheckoutForm}
//          options={{ title: 'Checkout Form' }}
//        />
//        <Stack.Screen
//          name="PostCheckout"
//          component={PostCheckout}
//          options={{ title: 'PostCheckout' , headerBackVisible: false,}}
//        />
//      </Stack.Navigator>
//    </NavigationContainer>
//  );
//};
//
//const ProfileButton = () => {
//  const navigation = useNavigation(); // Use navigation hook
//
//  return (
//    <TouchableOpacity onPress={() => navigation.navigate('Preferences')}>
//      <Icon name="person-circle-outline" size={30} color="#000" />
//    </TouchableOpacity>
//
//  );
//};
//
//const LogoutButton = () => {
//  const navigation = useNavigation();
//  const styles = StyleSheet.create({
//    mediumButton: {
//      margin: 10,
//      padding: 15,
//      backgroundColor: '#D30C7B',
//      borderRadius: 10,
//      alignItems: 'center',
//      elevation: 3,
//      shadowColor: '#000',
//      shadowOffset: { width: 2, height: 2 },
//      shadowOpacity: 0.2,
//      shadowRadius: 3,
//    },
//    buttonText: {
//      fontSize: 16,
//      color: 'white',
//    },
//  });
//
//  return(
//    <TouchableOpacity onPress={() => (handleLogout(navigation))} style={styles.mediumButton}>
//      <Text style={styles.buttonText}>Logout</Text>
//    </TouchableOpacity>
//  );
//}
//
//// Logout function
//const handleLogout = async (navigation) => {
//  try {
//    // Send logout request to the backend
//    const token = await AsyncStorage.getItem('userToken');
//    const response = await fetch(`${BASE_URL}/backend/auth/logout/`, {
//      method: 'POST',
//      headers: {
//        'Authorization': `Token ${token}`,
//        'Content-Type': 'application/json',
//      },
//    });
//
//    if (response.status === 200) {
//      // Clear AsyncStorage
//      await AsyncStorage.removeItem('userToken');
//      await AsyncStorage.removeItem('userId');
//      await AsyncStorage.removeItem('first_name');
//      await AsyncStorage.removeItem('userRole');
//
//      // Show the alert and navigate after dismiss
//      Alert.alert(
//        'Logout successful!',
//        '',
//        [
//          {
//            text: 'OK',
//            onPress: () => navigation.navigate('GeneralHome'),
//          },
//        ],
//        { cancelable: false }
//      );
//    } else {
//      Alert.alert('Logout failed, please try again.');
//    }
//  } catch (error) {
//    console.error('Error during logout:', error);
//    Alert.alert('Logout failed, please try again later.');
//  }
//};
//
//export default App;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import AdminDash from './src/pages/AdminDash';
import AuthPage from './src/pages/AuthPage';
import CartPage from './src/pages/CartPage';
import CheckoutForm from './src/pages/CheckoutForm';
import ComplaintsPage from './src/pages/ComplaintsPage';
import CompletePage from './src/pages/CompletePage';
import CreateAccountPage from './src/pages/CreateAccountPage';
import CreateDrinkPage from './src/pages/CreateDrinkPage';
import GeneralHomePage from './src/pages/GeneralHomePage';
import ManagerDash from './src/pages/ManagerDash';
import PaymentPage from './src/pages/PaymentPage';
import PostCheckout from './src/pages/PostCheckout';
import PreferencesPage from './src/pages/PreferencesPage';
import UpdateDrink from './src/pages/UpdateDrink';
import { BASE_URL } from './ip_address';

const Stack = createNativeStackNavigator();
const title = 'CodePop';

const App = () => {
  const initCart = async () => {
    try {
      const checkoutList = await AsyncStorage.getItem('checkoutList');
      if (checkoutList === null) {
        await AsyncStorage.setItem("checkoutList", JSON.stringify([]));
      }
    } catch (error) {
      console.error("Cart init error:", error);
    }
  };

  useEffect(() => {
    initCart();
  }, []);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'CherryBombOne': require('./assets/fonts/CherryBombOne-Regular.ttf'),
        });
      } catch (e) {
        console.warn("Font error:", e);
      }
    };
    loadFonts();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="GeneralHome"
          screenOptions={{ headerStyle: { backgroundColor: '#c8c8ee' } }}
        >
          <Stack.Screen name="Auth" component={AuthPage} options={{ title }} />
          <Stack.Screen name="CreateAccount" component={CreateAccountPage} options={{ title }} />
          <Stack.Screen name="Cart" component={CartPage} options={{ title }} />
          <Stack.Screen name="CreateDrink" component={CreateDrinkPage} options={{ title }} />
          <Stack.Screen name="ComplaintsPage" component={ComplaintsPage} options={{ title: 'Complaints' }} />
          <Stack.Screen name="Preferences" component={PreferencesPage} options={{ title }} />
          <Stack.Screen
            name="GeneralHome"
            component={GeneralHomePage}
            options={{
              title,
              headerRight: () => <ProfileButton />,
            }}
          />
          <Stack.Screen name="payment" component={PaymentPage} options={{ title: 'Payment' }} />
          <Stack.Screen name="UpdateDrink" component={UpdateDrink} options={{ title: 'Update Drink' }} />
          <Stack.Screen
            name="ManagerDash"
            component={ManagerDash}
            options={{ title: 'Manager Dash', headerRight: () => <LogoutButton /> }}
          />
          <Stack.Screen
            name="AdminDash"
            component={AdminDash}
            options={{ title: 'Admin Dash', headerRight: () => <LogoutButton /> }}
          />
          <Stack.Screen name="Complete" component={CompletePage} options={{ title: 'Complete' }} />
          <Stack.Screen name="Checkout" component={CheckoutForm} options={{ title: 'Checkout Form' }} />
          <Stack.Screen
            name="PostCheckout"
            component={PostCheckout}
            options={{ title: 'Post Checkout', headerBackVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GeneralHome" screenOptions={{headerStyle: {backgroundColor: '#FFFFFF'}}}>
        <Stack.Screen
          name="Auth"
          component={AuthPage}
          options={{
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}
        />
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountPage}
          options={{
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}
        />
        <Stack.Screen
          name="Cart"
          component={CartPage}
          options={{
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}
        />
        <Stack.Screen
          name="CreateDrink"
          component={CreateDrinkPage}
          options={{
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}

        />
        <Stack.Screen
          name="ComplaintsPage"
          component={ComplaintsPage}
          options={{ title: 'ComplaintsPage' }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesPage}
          options={{
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
            },}}
        />
        <Stack.Screen
          name="GeneralHome"
          component={GeneralHomePage}
          options={{
            headerShown: false,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
            },}}
        />
        <Stack.Screen
          name="payment"
          component={PaymentPage}
          options={{ title: 'Payment' }}
        />
        <Stack.Screen
          name="UpdateDrink"
          component={UpdateDrink}
          options={{ title: 'UpdateDrink' }}
        />
        <Stack.Screen
          name="ManagerDash"
          component={ManagerDash}
          options={{ title: 'ManagerDash', headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen
          name="AdminDash"
          component={AdminDash}
          options={{ title: 'AdminDash', headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen
          name="Complete"
          component={CompletePage}
          options={{ title: 'Complete' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutForm}
          options={{ title: 'Checkout Form' }}
        />
        <Stack.Screen
          name="PostCheckout"
          component={PostCheckout}
          options={{ title: 'PostCheckout' , headerBackVisible: false,}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const ProfileButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Preferences')} style={{ marginRight: 15 }}>
      <Icon name="person-circle-outline" size={30} color="#000" />
    </TouchableOpacity>
  );
};

const LogoutButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => handleLogout(navigation)} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
};

const handleLogout = async (navigation) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${BASE_URL}/backend/auth/logout/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'first_name', 'userRole']);
      Alert.alert('Logout successful!', '', [{ text: 'OK', onPress: () => navigation.navigate('GeneralHome') }]);
    } else {
      Alert.alert('Logout failed.');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
};

const styles = StyleSheet.create({
  logoutBtn: { marginRight: 10, padding: 8, backgroundColor: '#D30C7B', borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});

export default App;