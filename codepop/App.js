import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AdminDash from './src/pages/AdminDash';
import AuthPage from './src/pages/AuthPage';
import CheckoutForm from './src/pages/CheckoutForm';
import CompletePage from './src/pages/CompletePage';
import CreateAccountPage from './src/pages/CreateAccountPage';
import ManagerDash from './src/pages/ManagerDash';
import PaymentPage from './src/pages/PaymentPage';
import PostCheckout from './src/pages/PostCheckout';
import TabContainer from './src/components/TabContainer';
import CodePopLogo from './src/components/CodePopLogo';
import { getBaseURL, initBaseURL } from './ip_address';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createNativeStackNavigator();
const title = 'CodePop'


const AppNavigator = () => {
  const { colors } = useTheme();

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

  // Initialize base URL from AsyncStorage on app startup
  const initBaseURLOnStartup = async () => {
    try {
      await initBaseURL();
    } catch (error) {
      console.error('Failed to initialize base URL:', error);
    }
  };

  useEffect(() => {
    initCart();
    initBaseURLOnStartup();
  }, []);
  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GeneralHome" screenOptions={{headerStyle: {backgroundColor: colors.surface}}}>
        <Stack.Screen
          name="Auth"
          component={AuthPage}
          options={{ headerShown: false }}
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
          name="GeneralHome"
          component={TabContainer}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="payment"
          component={PaymentPage}
          options={{
            headerTitle: () => <CodePopLogo size={28} />,
            headerTitleAlign: 'center',
          }}
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

const App = () => {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
};

const ProfileButton = () => {
  const navigation = useNavigation(); // Use navigation hook

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Preferences')}>
      <Icon name="person-circle-outline" size={30} color="#000" />
    </TouchableOpacity>
    
  );
};

const LogoutButton = () => {
  const navigation = useNavigation();
  const styles = StyleSheet.create({
    mediumButton: {
      margin: 10,
      padding: 15,
      backgroundColor: '#D30C7B',
      borderRadius: 10,
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    buttonText: {
      fontSize: 16,
      color: 'white',
    },
  });

  return(
    <TouchableOpacity onPress={() => (handleLogout(navigation))} style={styles.mediumButton}>
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
  );
}

// Logout function
const handleLogout = async (navigation) => {
  try {
    // Send logout request to the backend
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${getBaseURL()}/backend/auth/logout/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('first_name');
      await AsyncStorage.removeItem('userRole');
      
      // Show the alert and navigate after dismiss
      Alert.alert(
        'Logout successful!',
        '',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('GeneralHome'),
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert('Logout failed, please try again.');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    Alert.alert('Logout failed, please try again later.');
  }
};

export default App;
