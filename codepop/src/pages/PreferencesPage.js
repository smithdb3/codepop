import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';
import DropDown from '../components/DropDown';
import React from 'react';

const PreferencesPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState(null);
  const navigation = useNavigation();
  const [openDropdown, setOpenDropdown] = useState({
    sodas: false,
    syrups: false,
    juices: false,
  });
  const [SodaUsed, setSoda] = useState([]);
  const [SyrupsUsed, setSyrups] = useState([]);
  const [AddIns, setAddIns] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]); // To store fetched preferences
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useFocusEffect(
    React.useCallback(() => {
      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          if (token && storedName) {
            setIsLoggedIn(true);  // User is logged in
            setName(storedName);  // Set username for display
          } else {
            setIsLoggedIn(false);  // No user is logged in
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      };
  
      checkLoginStatus();


      const fetchData = async () => {
        const response = await fetch(`${BASE_URL}/backend/inventory/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const inventory = await response.json();
        const items = inventory.map(item => ({
          value: item.ItemName,
          ItemType: item.ItemType
        }));
        setInventoryData(items);
      };
      fetchData();
  
      const fetchUserPreferences = async () => {
        const token = await AsyncStorage.getItem('userToken');
        const userId = await AsyncStorage.getItem('userId');
        
        try {
          const response = await fetch(`${BASE_URL}/backend/preferences/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`,
            }
          });
          const preferences = await response.json();
          setUserPreferences(preferences); // Store the preferences in state
          setIsLoading(false);
          // Preselect preferences based on the user's saved preferences
          const filteredSoda = preferences
            .filter(item => filterInventory("Soda").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
            .map(item => item.Preference);
          setSoda(filteredSoda);
          
          const filteredSyrups = preferences
          .filter(item => filterInventory("Syrup").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
          .map(item => item.Preference);
          setSyrups(filteredSyrups);
          
          const filteredAddIns = preferences
          .filter(item => filterInventory("Add In").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
          .map(item => item.Preference);
          setAddIns(filteredAddIns);
          
        } catch (error) {
          console.error("Error fetching preferences:", error);
        }
      };
      
      fetchUserPreferences();
    }, [])  // The empty array ensures this only runs when the screen is focused
  );

  // Login button press
  const goToLoginPage = () => {
    navigation.navigate('Auth');  // Navigate to the login page
  };

  const savePreferences = async (pref) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');  // Retrieve userId from AsyncStorage
      const response = await fetch(`${BASE_URL}/backend/preferences/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ 
          UserID: userId,
          Preference: pref,
        })
      });
      if (response.ok) {
        const data = await response.json();
      } else {
        // throw new Error(`Failed to add drink. Status: ${response.status} ${response.statusText}`);
        const errorData = await response.json();  // Get the response body
        throw new Error(`Failed to add drink. Status: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
        console.error(error);
    } 
  }

  const removePreferences = async (pref) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');  // Retrieve userId from AsyncStorage
      const getResponse = await fetch(`${BASE_URL}/backend/preferences/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        }
      });

      const curr = await getResponse.json();

      const parsedCurr = curr.map(preferences => ({
        UserID: preferences.UserID,
        Preference: preferences.Preference,
        PreferenceID: preferences.PreferenceID,
      }));

      const filteredPreferences = parsedCurr.filter(item => 
        String(item.UserID) === String(userId) && item.Preference.toLowerCase() === pref.toLowerCase()
      );

      // console.log
      for (let i = 0; i < filteredPreferences.length; i++) {
        console.log(filteredPreferences[i].PreferenceID);
        const response = await fetch(`${BASE_URL}/backend/preferences/${filteredPreferences[i].PreferenceID}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
          body: JSON.stringify({ 
            UserID: userId,
            Preference: pref,
          })
        });
        if (!response.ok) {
          // throw new Error(`Failed to add drink. Status: ${response.status} ${response.statusText}`);
          const errorData = await response.json();  // Get the response body
          throw new Error(`Failed to add drink. Status: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        } 
      }
    } catch (error) {
        console.error(error);
    } 
  }


  const filterInventory = (type) => {
    const filteredItems = inventoryData.filter(item => item.ItemType === type);

    // Map over the filtered soda items to get only their names
    // const filteredItemsNames = filteredItems.map(item => item.value);
    const filteredItemsNames = filteredItems.map(item => ({
      label: item.value, // assuming `value` contains the item name
      value: item.value  // you can use the same value for both label and value, or customize it
    }));

    // Log the names of all Soda items
    // console.log(filteredItemsNames);
    return filteredItemsNames;
  }

  const handleSodaSelection = (soda) => {
    setSoda((prevSodas) => {
      if (prevSodas.includes(soda)) {
        // If soda is already selected, remove it
        removePreferences(soda);
        return prevSodas.filter((item) => item !== soda);
      } else {
        // Otherwise, add the soda to the list
        savePreferences(soda);
        return [...prevSodas, soda];
      }
    });
  };
    
  const handleSyrupSelection = (syrup) => {
    setSyrups((prevSyrups) => {
      if (prevSyrups.includes(syrup)) {
        // If soda is already selected, remove it
        removePreferences(syrup);
        return prevSyrups.filter((item) => item !== syrup);
      } else {
        // Otherwise, add the soda to the list
        savePreferences(syrup);
        return [...prevSyrups, syrup];
      }
    });
  };

  const handleAddInSelection = (addIn) => {
    setAddIns((prevAdd) => {
      if (prevAdd.includes(addIn)) {
        // If soda is already selected, remove it
        removePreferences(addIn);
        return prevAdd.filter((item) => item !== addIn);
      } else {
        // Otherwise, add the soda to the list
        savePreferences(addIn);
        return [...prevAdd, addIn];
      }
    });
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {isLoading ? (  // Conditionally render the content based on loading state
        <Text>Loading...</Text> // You can display a loading spinner or message here
      ) : (
        <>
          {/* If logged in, display the username and Logout button, otherwise display Login button */}
          {isLoggedIn ? (
            <>
              {/* Conditionally render the "Hello <username>" if username exists */}
              {name ? <Text style={styles.greeting}>{name}'s Drinks</Text> : null}
              <View style={styles.navBarSpace}>
                {/* <Text style={styles.subtitleText}>Saved Drinks (can be created on ratings page)</Text> */}
                <Text style={styles.subtitleText}>Preferences</Text>
                {/* <Text>{SodaUsed}</Text> */}
                <DropDown
                  title='Sodas'
                  options={filterInventory("Soda")}
                  onSelect={handleSodaSelection} 
                  isOpen={openDropdown.sodas}
                  setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
                  selectedValues={SodaUsed} // Pass selected values for prepopulation
                />
                <DropDown 
                  title='Syrups' 
                  options={filterInventory("Syrup")} 
                  onSelect={handleSyrupSelection} 
                  isOpen={openDropdown.syrups}
                  setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
                  selectedValues={SyrupsUsed} // Pass selected values for prepopulation
                />
                <DropDown 
                  title='Add ins' 
                  options={filterInventory("Add In")} 
                  onSelect={handleAddInSelection} 
                  isOpen={openDropdown.juices}
                  setOpen={() => setOpenDropdown(prev => ({ ...prev, juices: !prev.juices }))}
                  selectedValues={AddIns} // Pass selected values for prepopulation
                />
                {/* <Text style={styles.subtitleText}>Settings</Text>
                <DropDown 
                  title='Location' 
                  // options={filterOptions(syrupOptions)} 
                />
                <DropDown
                  title='Account'
                /> */}
              </View>
              
            </>
          ) : (
            <>
              <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={goToLoginPage} style={styles.mediumButton}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
      {/* <NavBar /> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#C6C8EE',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  carousel: {
    margin: 0,
    padding: 0,
  },
  title: {
    fontSize: 22,
  },
  subtitleText: {
    margin: 10,
    fontSize: 16,
  }
});

export default PreferencesPage;