import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getBaseURL } from '../../ip_address';
import { useTheme } from '../theme';

/** @returns {{ ok: true, data: unknown } | { ok: false }} */
function tryParseJsonResponse(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

const CreateAccountPage = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [first_name, setFirstname] = useState('');
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

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setMessage('Please enter your email.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name, last_name: '', username: trimmedEmail, password, email: trimmedEmail })
      });

      const text = await response.text();
      const parsed = tryParseJsonResponse(text);
      if (!parsed.ok) {
        setMessage(
          'Could not talk to the registration API (server returned a web page instead of JSON). Check that the app’s store URL is correct and the Django backend is running.'
        );
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = parsed.data;

        let errorMessage = 'Error registering user.';
        if (typeof errorData === 'object' && errorData !== null) {
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const errorValue = errorData[firstErrorKey];
            errorMessage = Array.isArray(errorValue) ? errorValue[0] : errorValue;
          }
        }
        setMessage(errorMessage);
        setIsLoading(false);
        return;
      }

      // Auto-login after successful registration
      const loginResponse = await fetch(`${getBaseURL()}/backend/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedEmail, password }),
      });

      if (loginResponse.status === 200) {
        const data = await loginResponse.json();
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user_id.toString());
        await AsyncStorage.setItem('first_name', data.first_name);
        await AsyncStorage.setItem('userEmail', trimmedEmail);
        await AsyncStorage.setItem('userRole', data.userRole ?? 'user');
        navigation.navigate('GeneralHome');
      } else {
        // Login failed unexpectedly — fall back to sign-in page
        navigation.navigate('Auth', { email: trimmedEmail });
      }
    } catch {
      setMessage('Error registering user. Please check your connection.');
      setIsLoading(false);
    }
  };

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
      backgroundColor: colors.surface
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 30,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    primaryButton: {
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 16,
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
      color: colors.surface,
    },
    input: {
      fontSize: 14,
      fontWeight: '400',
      marginBottom: 16,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      minHeight: 44,
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text style={styles.title}>Create Account</Text>
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
        <TextInput placeholder="First Name" placeholderTextColor={colors.textPlaceholder} onChangeText={setFirstname} style={styles.input} />
        <TextInput placeholder="Password" placeholderTextColor={colors.textPlaceholder} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity onPress={handleRegister} style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Auth', { email: email.trim() })} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Already have an account? Sign in.</Text>
        </TouchableOpacity>
        {message ? <Text style={styles.errorMessage}>{message}</Text> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateAccountPage;
