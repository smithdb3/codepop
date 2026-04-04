import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getBaseURL } from '../../ip_address';
import { CodePopLogo } from '../components/CodePopLogo';
import { useTheme } from '../theme';


const AuthPage = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const p = route.params?.email;
    if (typeof p === 'string') {
      setEmail(p);
    }
  }, [route.params?.email]);

  const handleRegister = () => {
    navigation.navigate('CreateAccount', { email: email.trim().toLowerCase() });
  };

  const handleSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Please enter your email.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: trimmed, password }),
      });

      if (response.status === 200) {
          const data = await response.json();

          console.log('Login response:', JSON.stringify(data));
          console.log('data.visiting:', data.visiting, 'typeof:', typeof data.visiting);
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user_id.toString());
          await AsyncStorage.setItem('first_name', data.first_name);
          await AsyncStorage.setItem('userEmail', trimmed);

          // If this is a home login (not visiting), store the home token and endpoint for future exchanges
          if (!data.visiting) {
            const homeEndpoint = await AsyncStorage.getItem('selectedStoreEndpoint') || getBaseURL();
            const homeStoreId = await AsyncStorage.getItem('selectedStoreId');
            console.log('Home login detected. Saving homeToken. Endpoint:', homeEndpoint, 'StoreId:', homeStoreId);
            await AsyncStorage.setItem('homeToken', data.token);
            await AsyncStorage.setItem('homeStoreEndpoint', homeEndpoint);
            await AsyncStorage.setItem('homeStoreId', homeStoreId || '');
          } else {
            console.log('Visiting login detected. NOT saving homeToken.');
          }

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
      marginTop: 8,
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
    ghostRow: {
      marginTop: 20,
      gap: 12,
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
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.textPlaceholder}
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} onPress={handleSignIn} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.ghostRow}>
        <TouchableOpacity onPress={handleRegister} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Create an account</Text>
        </TouchableOpacity>
      </View>
      {message && <Text style={styles.errorMessage}>{message}</Text>}
    </View>
    </SafeAreaView>
  );
};

export default AuthPage;
