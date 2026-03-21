import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';


const CreateAccountPage = ({ navigation, route }) => {
  const [first_name, setFirstname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name, last_name: '', username, password, email })
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
        return;
      }

      const data = await response.json();
      console.log('Registration successful:', data);
      navigation.navigate('Auth');
    } catch (error) {
      console.log('Network error:', error);
      setMessage('Error registering user. Please check your connection.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput placeholder="First Name" onChangeText={setFirstname} style={styles.input} />
      <TextInput placeholder="Username" onChangeText={setUsername} style={styles.input} />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput placeholder="Password" onChangeText={setPassword} secureTextEntry style={styles.input} />
      <TouchableOpacity onPress={handleRegister} style={styles.primaryButton}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.errorMessage}>{message}</Text> : null}
    </View>
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
});

export default CreateAccountPage;
