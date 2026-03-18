import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';


const AuthPage = ({ navigation, route }) => {
  const prefillEmail = route.params?.email ?? '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    navigation.navigate('CreateAccount');
  };

  const handleLoginWithEmail = async (emailValue) => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: emailValue, password }),
      });

      if (response.status === 200) {
          const data = await response.json();

          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user_id.toString());
          await AsyncStorage.setItem('first_name', data.first_name);
          if(data.userRole === 'admin'){
            await AsyncStorage.setItem('userRole', 'admin');
            Alert.alert('Login successful!');
            navigation.navigate('AdminDash');
          }else if(data.userRole === 'manager'){
            await AsyncStorage.setItem('userRole', 'manager');
            Alert.alert('Login successful!');
            navigation.navigate('ManagerDash');
          } else{
            await AsyncStorage.setItem('userRole', 'user');
            Alert.alert('Login successful!');
            navigation.navigate('GeneralHome');
          }
      } else {
          Alert.alert('Invalid credentials, please try again.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed. Please try again later.');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
      });

      if (response.status === 200) {
          const data = await response.json();

          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user_id.toString());
          await AsyncStorage.setItem('first_name', data.first_name);
          if(data.userRole === 'admin'){
            await AsyncStorage.setItem('userRole', 'admin');
            Alert.alert('Login successful!');
            navigation.navigate('AdminDash');
          }else if(data.userRole === 'manager'){
            await AsyncStorage.setItem('userRole', 'manager');
            Alert.alert('Login successful!');
            navigation.navigate('ManagerDash');
          } else{
            await AsyncStorage.setItem('userRole', 'user');
            Alert.alert('Login successful!');
            navigation.navigate('GeneralHome');
          }
      } else {
          Alert.alert('Invalid credentials, please try again.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      {prefillEmail ? (
        <>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.emailDisplay}>{prefillEmail}</Text>
          <TextInput
            placeholder="Password"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleLoginWithEmail(prefillEmail)}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
          {message && <Text style={styles.errorMessage}>{message}</Text>}
        </>
      ) : (
        <>
          <Image
            source={require('../../assets/robot-with-soda.png')}
            style={styles.image}
          />
          <Text style={styles.title}>CodePop</Text>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
          {message && <Text style={styles.errorMessage}>{message}</Text>}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    paddingBottom: 30,
    color: '#222831',
  },
  emailDisplay: {
    fontSize: 16,
    color: '#222831',
    marginBottom: 24,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#222831',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FF2E63',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
  },
});

export default AuthPage;
