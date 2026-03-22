import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import Gif from '../components/Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import AIAlert from '../components/AIAlert';
import CodePopLogo from '../components/CodePopLogo';

const flavorMap = {
  // Sodas
  'coke': ['Bold', 'Classic'], 'diet coke': ['Light', 'Classic'], 'coke zero': ['Bold', 'Light'],
  'sprite': ['Crisp', 'Citrusy'], 'mtn. dew': ['Bold', 'Citrusy'],
  'dr. pepper': ['Rich', 'Spiced'], 'lemonade': ['Tart', 'Citrusy'],
  'rootbeer': ['Sweet', 'Spiced'], 'fanta': ['Fruity', 'Sweet'],
  'pepsi': ['Bold', 'Sweet'],
  // Syrups
  'vanilla': ['Sweet', 'Creamy'], 'coconut': ['Tropical', 'Sweet'],
  'mango': ['Tropical', 'Fruity'], 'strawberry': ['Fruity', 'Sweet'],
  'raspberry': ['Fruity', 'Tart'], 'peach': ['Fruity', 'Sweet'],
  'watermelon': ['Fruity', 'Sweet'], 'lavender': ['Floral', 'Sweet'],
  'peppermint': ['Cool', 'Fresh'], 'salted caramel': ['Sweet', 'Rich'],
  'hazelnut': ['Nutty', 'Sweet'], 'gingerbread': ['Spiced', 'Warm'],
  'passion fruit': ['Tropical', 'Tart'], 'blue raspberry': ['Tart', 'Fruity'],
  'lemon': ['Tart', 'Citrusy'], 'lime': ['Tart', 'Citrusy'],
  'pineapple': ['Tropical', 'Tart'], 'cherry': ['Fruity', 'Sweet'],
  'cotton candy': ['Sweet', 'Playful'], 'bubble gum': ['Sweet', 'Playful'],
  // Add-ins
  'cream': ['Creamy', 'Smooth'], 'coconot cream': ['Tropical', 'Creamy'],
  'whip': ['Creamy', 'Sweet'], 'french vanilla creamer': ['Creamy', 'Sweet'],
  'strawberry puree': ['Fruity', 'Sweet'], 'peach puree': ['Fruity', 'Sweet'],
  'mango puree': ['Tropical', 'Fruity'], 'raspberry puree': ['Fruity', 'Tart'],
};

const getDrinkTags = (sodas, syrups, addins) => {
  const all = [...sodas, ...syrups, ...addins];
  const seen = new Set();
  const tags = [];
  for (const item of all) {
    const descriptors = flavorMap[item.toLowerCase()] || [];
    for (const d of descriptors) {
      if (!seen.has(d) && tags.length < 4) {
        seen.add(d);
        tags.push(d);
      }
    }
  }
  return tags;
};


const CreateDrinkPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [drinkDict, setDrinkDict] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [openDropdown, setOpenDropdown] = useState({
    sodas: false,
    syrups: false,
    addins: false,
  });

  // variables to add to drink object
  const [SodaUsed, setSoda] = useState([]);
  const [SyrupsUsed, setSyrups] = useState([]);
  const [AddIns, setAddIns] = useState([]);
  const [selectedSize, setSize] = useState(null);
  const [selectedIce, setIce] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.fromGenerateButton) {
        console.log("Generating drinks activated from home page button");
        GenerateAI();
      }
      resetDrinkForm();
    }, [route.params?.fromGenerateButton, route.params?.fromCartPage])
  );

  const resetDrinkForm = () => {
    setSoda([]);  // Clear selected sodas
    setSyrups([]);  // Clear selected syrups
    setAddIns([]);  // Clear selected add-ins
    setIce(null);  // Clear selected ice amount
    setSize(null);  // Clear selected size
  };
  
  const addToCart = async () => {
    try {
      // check if ice and size have been selected
      if(selectedIce == null || selectedSize == null || SodaUsed.length == 0){

        Alert.alert("Dont forget to choose a Soda, Size and, Ice Ammount!")

      }else{
        const token = await AsyncStorage.getItem('userToken');
    
        const response = await fetch(`${BASE_URL}/backend/drinks/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            Name: "Drink in User Cart",  // Example name for the drink
            SodaUsed: SodaUsed,  // Default value if SodaUsed is null
            SyrupsUsed: SyrupsUsed,
            AddIns: AddIns,
            Price: 2.00,
            User_Created: true,    // Assuming the user is creating the drink
            Size: selectedSize,
            Ice: selectedIce,
          })
        });
    
        if (!response.ok) {
          throw new Error(`Failed to add drink. Status: ${response.status}`);
        }
        // add drink item (the drinks ID) to the checkout list from App.js
        try{
          // gets list of out of storage on your phone
          cartList = await AsyncStorage.getItem("checkoutList");
          const currentList = cartList ? JSON.parse(cartList) : [];
          // takes the response (what we get after we create a drink) and extracts the drinkID
          const data = await response.json();
          const drinkID = data.DrinkID;
          // add the drinkID to the checkoutList
          const updatedList = [...currentList, drinkID]
          // Saves the checkoutlist back into the storage on the phone
          await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
        }catch (error){
          console.log(error)
        }

        navigation.navigate('Cart');
      }
    } catch (error) {
      console.error('Error adding drink to cart:', error);
    }
  };  
  

  const handleSizeSelection = (size) => {
    setSize(size);
  };
  
  const handleIceSelection = (ice) => {
    setIce(ice);
  };

  const handleSodaSelection = (soda) => {
    setSoda((prevSodas) => {
      if (prevSodas.includes(soda)) {
        // If soda is already selected, remove it
        return prevSodas.filter((item) => item !== soda);
      } else {
        // Otherwise, add the soda to the list
        return [...prevSodas, soda];
      }
    });
  };
  
  
  const handleSyrupSelection = (syrup) => {
    setSyrups((prevSyrups) => {
      if (prevSyrups.includes(syrup)) {
        // If soda is already selected, remove it
        return prevSyrups.filter((item) => item !== syrup);
      } else {
        // Otherwise, add the soda to the list
        return [...prevSyrups, syrup];
      }
    });
  };

  const handleAddInSelection = (addIn) => {
    setAddIns((prevAdd) => {
      if (prevAdd.includes(addIn)) {
        // If soda is already selected, remove it
        return prevAdd.filter((item) => item !== addIn);
      } else {
        // Otherwise, add the soda to the list
        return [...prevAdd, addIn];
      }
    });
  };
  
  // search and list stiff
  const filterOptions = (options = []) => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const handleSearch = (text) => {
    setSearchText(text);
    setOpenDropdown({
      sodas: !!text,
      syrups: !!text,
      addins: !!text,
    });
  };
  
  // function for generate drink button which generates a drink with AI   
    
  const GenerateAI = async () => {
    try {
      const user_id = await AsyncStorage.getItem('userId');
      let url = `${BASE_URL}/backend/generate/`;

      if (user_id) {
        url = `${BASE_URL}/backend/generate/${user_id}/`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error when trying to generate AI drink. Status: ${response.status}`);
      }

      const drink = await response.json();
      setDrinkDict(drink);
      setModalVisible(true);
      console.log(drink);
    }
    catch (error) {
      console.error('Error when trying to generate AI drink:', error);
    }
  };

  // reactive gif stuff
  const getLayers = (soda, syrups, addins) => {
    const layers = [];
    const totalItems = soda.length + syrups.length + addins.length;
  
    soda.forEach((sodaName) => {
      const sodaOption = sodaOptions.find((opt) => opt.label === sodaName);
      if (sodaOption) {
        layers.push({ color: sodaOption.color, height: 100 / totalItems });
      } else {
      }
    });
  
    syrups.forEach((syrupName) => {
      const syrupOption = syrupOptions.find((opt) => opt.label === syrupName);
      if (syrupOption) {
        layers.push({ color: syrupOption.color, height: 100 / totalItems });
      } else {
      }
    });
  
    addins.forEach((addinName) => {
      const addInOption = AddInOptions.find((opt) => opt.label === addinName); // Assuming AddIns use syrupOptions
      if (addInOption) {
        layers.push({ color: addInOption.color, height: 100 / totalItems });
      } else {
      }
    });
    return layers;
  };  
  
  const layers = getLayers(SodaUsed, SyrupsUsed, AddIns);
  

  return (
    <View style={styles.wholePage}>
      {/* ── PINNED TOP SECTION ── */}
      <View style={styles.pinnedTop}>
        <View style={styles.reviewCard}>
          {/* Small corner Gif */}
          <View style={styles.gifCorner}>
            <Gif layers={layers} width={60} height={90} />
          </View>

          {/* Review content */}
          <View style={styles.reviewContent}>
            <Text style={styles.reviewTitle}>Your Drink</Text>

            {(selectedSize || selectedIce) ? (
              <Text style={styles.reviewMeta}>
                {[selectedSize, selectedIce ? `${selectedIce} Ice` : null].filter(Boolean).join(' · ')}
              </Text>
            ) : (
              <Text style={styles.reviewPlaceholder}>Select size and ice below</Text>
            )}

            {SodaUsed.length > 0 && (
              <Text style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Soda  </Text>
                <Text style={styles.reviewValue}>{SodaUsed.join(', ')}</Text>
              </Text>
            )}

            {SyrupsUsed.length > 0 && (
              <Text style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Syrups  </Text>
                <Text style={styles.reviewValue}>{SyrupsUsed.join(', ')}</Text>
              </Text>
            )}

            {AddIns.length > 0 && (
              <Text style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Add-ins  </Text>
                <Text style={styles.reviewValue}>{AddIns.join(', ')}</Text>
              </Text>
            )}

            {SodaUsed.length === 0 && SyrupsUsed.length === 0 && AddIns.length === 0 && (
              <Text style={styles.reviewPlaceholder}>Pick ingredients below to build your drink</Text>
            )}

            {getDrinkTags(SodaUsed, SyrupsUsed, AddIns).length > 0 && (
              <View style={styles.flavorTagRow}>
                {getDrinkTags(SodaUsed, SyrupsUsed, AddIns).map(tag => (
                  <View key={tag} style={styles.flavorTag}>
                    <Text style={styles.flavorTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Action buttons — always visible in pinned area */}
        <View style={styles.pinnedButtonRow}>
          <TouchableOpacity onPress={GenerateAI} style={[styles.pinnedButton, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Ask Tonic</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addToCart} style={[styles.pinnedButton, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Add to My Order</Text>
          </TouchableOpacity>
        </View>

        {/* AIAlert modal */}
        {drinkDict && (
          <AIAlert
            isModalVisible={isModalVisible}
            toggleModal={() => setModalVisible(false)}
            drinkDict={drinkDict}
          />
        )}
      </View>

      {/* ── SCROLLABLE INGREDIENT SECTION ── */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* Page Title */}
        <Text style={styles.pageTitle}>Design Your Drink</Text>

        {/* Size and Ice Selector Row */}
        {/* Size Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>Size</Text>
          <View style={styles.tileRow}>
            {[
              { size: '16oz', emoji: '🥤' },
              { size: '24oz', emoji: '🧋' },
              { size: '32oz', emoji: '🍹' }
            ].map(({ size, emoji }) => (
              <TouchableOpacity
                key={size}
                onPress={() => handleSizeSelection(size)}
                style={[styles.tileButton, selectedSize === size && styles.tileButtonSelected]}
              >
                <Text style={styles.tileEmoji}>{emoji}</Text>
                <Text style={[styles.tileLabel, selectedSize === size && styles.tileLabelSelected]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ice Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>Ice</Text>
          <View style={styles.tileRow}>
            {[
              { ice: 'No Ice', emoji: '🚫' },
              { ice: 'Light', emoji: '💧' },
              { ice: 'Regular', emoji: '🧊' },
              { ice: 'Extra', emoji: '❄️' }
            ].map(({ ice, emoji }) => (
              <TouchableOpacity
                key={ice}
                onPress={() => handleIceSelection(ice)}
                style={[styles.tileButton, selectedIce === ice && styles.tileButtonSelected]}
              >
                <Text style={styles.tileEmoji}>{emoji}</Text>
                <Text style={[styles.tileLabel, selectedIce === ice && styles.tileLabelSelected]}>{ice}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Input */}
        <TextInput
          placeholder="Search ingredients"
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />

        {/* Dropdowns */}
        <DropDown
          title="🥤 Sodas"
          options={filterOptions(sodaOptions)}
          onSelect={handleSodaSelection}
          isOpen={openDropdown.sodas}
          setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
          selectedValues={SodaUsed}
        />
        <DropDown
          title="🍯 Syrups"
          options={filterOptions(syrupOptions)}
          onSelect={handleSyrupSelection}
          isOpen={openDropdown.syrups}
          setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
          selectedValues={SyrupsUsed}
        />
        <DropDown
          title="✨ Add-Ins"
          options={filterOptions(AddInOptions)}
          onSelect={handleAddInSelection}
          isOpen={openDropdown.addins}
          setOpen={() => setOpenDropdown(prev => ({ ...prev, addins: !prev.addins }))}
          selectedValues={AddIns}
        />

        {/* Bottom spacing for NavBar */}
        <View style={styles.navBarSpace} />
      </ScrollView>

      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  wholePage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pinnedTop: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reviewCard: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    paddingRight: 80,
    marginBottom: 10,
    minHeight: 125,
  },
  gifCorner: {
    position: 'absolute',
    top: 4,
    right: 8,
    overflow: 'hidden',
  },
  reviewContent: {},
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222831',
    marginBottom: 2,
  },
  reviewMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  reviewPlaceholder: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  reviewRow: {
    fontSize: 12,
    color: '#222831',
    marginBottom: 2,
    lineHeight: 17,
  },
  reviewLabel: {
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  reviewValue: {
    color: '#222831',
    fontSize: 12,
  },
  flavorTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  flavorTag: {
    backgroundColor: '#F0FDFC',
    borderWidth: 1,
    borderColor: '#08D9D6',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  flavorTagText: {
    color: '#08D9D6',
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pinnedButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222831',
    marginBottom: 16,
  },
  selectorSection: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tileButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 62,
  },
  tileButtonSelected: {
    backgroundColor: '#FF2E63',
    borderColor: '#FF2E63',
  },
  tileEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tileLabelSelected: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#FF2E63',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#08D9D6',
  },
  secondaryButtonText: {
    color: '#08D9D6',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginVertical: 16,
    color: '#222831',
  },
  navBarSpace: {
    marginBottom: 80,
  },
});

export default CreateDrinkPage;
