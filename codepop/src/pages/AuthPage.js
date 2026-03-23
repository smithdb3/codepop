import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getBaseURL } from '../../ip_address';
import { CodePopLogo } from '../components/CodePopLogo';
import { useTheme } from '../theme';


const AuthPage = ({ navigation, route }) => {
  const { colors } = useTheme();
  const prefillEmail = route.params?.email ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    navigation.navigate('CreateAccount');
  };

  const handleLoginWithEmail = async (emailValue) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/login/`, {
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
            navigation.navigate('AdminDash');
          }else if(data.userRole === 'manager'){
            await AsyncStorage.setItem('userRole', 'manager');
            navigation.navigate('ManagerDash');
          } else{
            await AsyncStorage.setItem('userRole', 'user');
            navigation.navigate('GeneralHome');
          }
      } else {
          Alert.alert('Invalid credentials, please try again.');
          setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: email, password }),
      });

      if (response.status === 200) {
          const data = await response.json();

          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user_id.toString());
          await AsyncStorage.setItem('first_name', data.first_name);
          if(data.userRole === 'admin'){
            await AsyncStorage.setItem('userRole', 'admin');
            navigation.navigate('AdminDash');
          }else if(data.userRole === 'manager'){
            await AsyncStorage.setItem('userRole', 'manager');
            navigation.navigate('ManagerDash');
          } else{
            await AsyncStorage.setItem('userRole', 'user');
            navigation.navigate('GeneralHome');
          }
      } else {
          Alert.alert('Invalid credentials, please try again.');
          setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed. Please try again later.');
      setIsLoading(false);
    }
  };

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      paddingBottom: 30,
      color: colors.textPrimary,
    },
    emailPill: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 24,
    },
    emailPillText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    input: {
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      width: '100%',
      borderRadius: 8,
      backgroundColor: colors.surface,
      fontSize: 14,
      color: colors.textPrimary,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    primaryButton: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.primary,
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
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    errorMessage: {
      fontSize: 12,
      color: colors.error,
      marginTop: 12,
      textAlign: 'center',
    },
    ghostButton: {
      marginTop: 16,
    },
    ghostButtonText: {
      color: colors.secondary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
    <View style={styles.container}>
      <View style={{ marginBottom: 32 }}>
        <CodePopLogo size={64} />
      </View>
      <Text style={styles.title}>Sign In</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.emailPill}>
        <Text style={styles.emailPillText}>{prefillEmail} ✎</Text>
      </TouchableOpacity>
      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} onPress={() => handleLoginWithEmail(prefillEmail)} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
      {message && <Text style={styles.errorMessage}>{message}</Text>}
    </View>
    </SafeAreaView>
  );
};

export default AuthPage;
