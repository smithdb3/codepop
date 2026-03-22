import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';


const CreateAccountPage = ({ navigation, route }) => {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
            <ActivityIndicator color="#FFFFFF" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
    color: '#222831',
  },
  primaryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#222831',
    minHeight: 44,
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  emailInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  emailInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222831',
  },
  ghostButton: {
    marginTop: 16,
  },
  ghostButtonText: {
    color: '#08D9D6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CreateAccountPage;
