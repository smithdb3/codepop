import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';
import { useTheme } from '../theme';


const CreateAccountPage = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [first_name, setFirstname] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name, last_name: '', username: email, password, email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Server error:', errorData);

        // Format error message from server
        let errorMessage = 'Error registering user.';
        if (typeof errorData === 'object') {
          // Extract first error message if it's field-based
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

      const data = await response.json();
      console.log('Registration successful:', data);
      navigation.navigate('Auth', { email });
    } catch (error) {
      console.log('Network error:', error);
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
    emailInfoBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emailInfoLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    emailInfoText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
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
        <View style={styles.emailInfoBox}>
          <Text style={styles.emailInfoLabel}>Registering as</Text>
          <Text style={styles.emailInfoText}>{email}</Text>
        </View>
        <TextInput placeholder="First Name" onChangeText={setFirstname} style={styles.input} />
        <TextInput placeholder="Password" onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity onPress={handleRegister} style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('EmailCheck')} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Already have an account? Sign in.</Text>
        </TouchableOpacity>
        {message ? <Text style={styles.errorMessage}>{message}</Text> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateAccountPage;
