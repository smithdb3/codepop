import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getBaseURL } from '../../ip_address';
import { CodePopLogo } from '../components/CodePopLogo';
import { useTheme } from '../theme';

const EmailCheckPage = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseURL()}/backend/auth/check-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json();
      if (data.exists) {
        navigation.navigate('Auth', { email: trimmed });
      } else {
        navigation.navigate('CreateAccount', { email: trimmed });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const makeStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 48,
    },
    logoBlock: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 32,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 44,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      marginBottom: 16,
    },
    continueButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    continueButtonDisabled: { opacity: 0.6 },
    continueButtonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoBlock}>
          <CodePopLogo size={64} />
        </View>

        <Text style={styles.title}>Continue with email</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.textPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus={true}
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          onSubmitEditing={handleContinue}
          returnKeyType="go"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.continueButtonText}>Continue</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EmailCheckPage;
