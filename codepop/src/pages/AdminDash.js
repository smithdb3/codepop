import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import { useFocusEffect } from '@react-navigation/native';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDash = () => {

  const [users, setUsers] = useState([]);

  useFocusEffect(React.useCallback(() => {
    getUsers();
  }, []));

  const getUsers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/users/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error when trying to fetch a list of users. Status: ${response.status}`);
      }

      const userList = await response.json();
      console.log(userList);
      setUsers(userList);
    }
    catch (error) {
      console.error('Error when trying to fetch a list of users:', error);
    }
  }

  const deleteUser = async (user) => {
    try {
      const user_id = await AsyncStorage.getItem('userId');

      if (!user_id) {
        console.log("Error: failed to get active user's id.")
        return
      }

      if (Number(user_id) === Number(user.id)) {
        Alert.alert('Error: you cannot delete yourself')
      }
      else {
        console.log("Deleting user...");
        const response = await fetch(`${BASE_URL}/backend/users/delete/${user.id}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        if (!response.ok) {
          throw new Error(`Error when trying to delete a user. Status: ${response.status}`);
        }

        const result = await response.json()
        Alert.alert(result.message)
        getUsers();
      }
    }
    catch (error) {
      console.error('Error when trying to delete a user:', error);
    }
  };

  const promoteUser = async (user) => {
    try {
      if (user.is_superuser === true) {
        Alert.alert('Error: User is already an admin');
      }
      else {
        console.log("Promoting user...");
        const response = await fetch(`${BASE_URL}/backend/users/promote/${user.id}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          }
        });
    
        if (!response.ok) {
          throw new Error(`Error when trying to promote a user. Status: ${response.status}`);
        }

        const result = await response.json()
        Alert.alert(result.message)
        getUsers();
      }
    }
    catch (error) {
      console.error('Error when trying to promote a user:', error);
    }
  };

  const renderUser = ({ item }) => {
    return (
      <View style={styles.box}>
        <View>
          <Text style={styles.mainText}>{item.username}</Text>
          <Text style={styles.secondaryText}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.secondaryText}>Role: {item.is_superuser ? <Text style={styles.role}>Admin</Text> : item.is_staff ? <Text style={styles.role}>Staff</Text> : "User"}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => deleteUser(item)} style={styles.button}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => promoteUser(item)} style={styles.button}>
            <Text style={styles.buttonText}>Promote</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Admin Dashboard</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(user) => user.username}
        renderItem={renderUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#C6C8EE',
  },
  headerContainer: {
    flex: 0,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 5,
    borderColor: '#D30C7B',
    marginBottom: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  box: {
    backgroundColor: '#f4f4f4',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 2,

    flex: 0,
    flexDirection: "row",
    justifyContent: 'space-between',
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  secondaryText: {
    fontSize: 20,
    marginTop: 10,
  },
  role: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  button: {
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#D30C7B',
    padding: 10,
    borderRadius: 5,
    height: 45,
    width: 100,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default AdminDash;