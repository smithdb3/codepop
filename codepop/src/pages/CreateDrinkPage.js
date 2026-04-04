import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation } from '@react-navigation/native';
import Gif from '../components/Gif';
import { useIngredients } from '../components/useIngredients';
import ingredientMeta from '../components/Ingredients';
import { getBaseURL } from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import AIAlert from '../components/AIAlert';
import CodePopLogo from '../components/CodePopLogo';
import { useTheme } from '../theme';
import TabNavigationContext from '../context/TabNavigationContext';

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

const CreateDrinkPage = ({ insideTabContainer = false, isFocused = true, navigation: navProp, route = {} }) => {
const navigation = navProp || useNavigation();
const { colors } = useTheme();

const tabNav = useContext(TabNavigationContext);
const { sodaOptions, syrupOptions, addInOptions } = useIngredients();

const [drinkDict, setDrinkDict] = useState([]);
const [isModalVisible, setModalVisible] = useState(false);
const [searchText, setSearchText] = useState('');
const [currentDrinkToEdit, setCurrentDrinkToEdit] = useState(null);
const didPopulateFromEdit = React.useRef(false);
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

useEffect(() => {
  if (!isFocused) {
    didPopulateFromEdit.current = false;
    return;
  }

  // Check both route params (for stack navigation) and tabNav (for tab navigation)
  const drinkToEdit = route.params?.drinkToEdit || tabNav?.drinkToEdit;

  if (drinkToEdit) {
    const iceNorm = {
      'none': 'No Ice', 'no ice': 'No Ice',
      'light': 'Light', 'regular': 'Regular', 'extra': 'Extra',
    };

    setSoda((drinkToEdit.SodaUsed || []).map(s => s.toLowerCase()));
    setSyrups((drinkToEdit.SyrupsUsed || []).map(s => s.toLowerCase()));
    setAddIns((drinkToEdit.AddIns || []).map(s => s.toLowerCase()));
    setSize(drinkToEdit.Size || null);
    setIce(iceNorm[drinkToEdit.Ice?.toLowerCase()] || drinkToEdit.Ice || null);
    setCurrentDrinkToEdit(drinkToEdit);
    didPopulateFromEdit.current = true;

    // Clear the drinkToEdit from tabNav after using it
    if (tabNav?.setDrinkToEdit) {
      tabNav.setDrinkToEdit(null);
    }

  } else if (!didPopulateFromEdit.current) {
    resetDrinkForm();
    setCurrentDrinkToEdit(null);

    if (route.params?.fromGenerateButton) {
      console.log("Generating drinks activated from home page button");
      GenerateAI();
    }

    if (tabNav && tabNav.shouldGenerateDrink) {
      const timer = setTimeout(() => {
        GenerateAI();
      }, 220);
      return () => clearTimeout(timer);
    }
  }
}, [
  isFocused,
  route.params?.drinkToEdit,
  route.params?.fromGenerateButton,
  tabNav?.shouldGenerateDrink,
  tabNav?.drinkToEdit
]);

const resetDrinkForm = () => {
  setSoda([]);  // Clear selected sodas
  setSyrups([]);  // Clear selected syrups
  setAddIns([]);  // Clear selected add-ins
  setIce(null);  // Clear selected ice amount
  setSize(null);  // Clear selected size
};

const saveDrink = async () => {
  if (selectedIce == null || selectedSize == null || SodaUsed.length === 0) {
    Alert.alert("Don't forget to choose a Soda, Size and Ice Amount!");
    return;
  }
  try {
    const userId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('userToken');
    if (!userId || !token) {
      Alert.alert('Sign in to save drinks!');
      return;
    }
    const drinkRes = await fetch(`${getBaseURL()}/backend/drinks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Name: 'Saved Drink',
        SodaUsed, SyrupsUsed, AddIns,
        Price: 2.00, User_Created: true,
        Size: selectedSize, Ice: selectedIce,
      }),
    });
    if (!drinkRes.ok) throw new Error(`Failed to create drink. Status: ${drinkRes.status}`);
    const drink = await drinkRes.json();
    const favRes = await fetch(`${getBaseURL()}/backend/users/${userId}/favorites/${drink.DrinkID}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
      body: JSON.stringify({ action: 'add' }),
    });
    if (!favRes.ok) throw new Error(`Failed to save drink. Status: ${favRes.status}`);
    Alert.alert('Drink saved!', 'Find it in your Saved Drinks on the home tab.');
  } catch (error) {
    console.error('Error saving drink:', error);
    Alert.alert('Error', 'Could not save drink. Please try again.');
  }
};

const addToCart = async () => {
  if (selectedIce == null || selectedSize == null || SodaUsed.length === 0) {
    Alert.alert("Don't forget to choose a Soda, Size and Ice Amount!");
    return;
  }

  const drinkToEdit = currentDrinkToEdit;
  const body = JSON.stringify({
    Name: drinkToEdit ? "Updated Drink" : "Drink in User Cart",
    SodaUsed, SyrupsUsed, AddIns,
    Price: 2.00, User_Created: true,
    Size: selectedSize, Ice: selectedIce,
  });

  try {
    if (drinkToEdit) {
      // PUT — update existing drink, no cart list change needed
      const response = await fetch(`${getBaseURL()}/backend/drinks/${drinkToEdit.DrinkID}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) throw new Error(`Failed to update drink. Status: ${response.status}`);
    } else {
      // POST — create new drink and append to cart
      const response = await fetch(`${getBaseURL()}/backend/drinks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) {
        throw new Error(`Failed to add drink. Status: ${response.status}`);
      }

      const data = await response.json();

      try {
        const cartList = await AsyncStorage.getItem("checkoutList");
        const currentList = cartList ? JSON.parse(cartList) : [];

        const updatedList = [...currentList, data.DrinkID];
        await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));

      } catch (error) {
        console.log(error);
      }
    }

    // Navigate to cart after either creating or updating
    if (tabNav && tabNav.navigateToTab) {
      tabNav.navigateToTab(2); // Cart tab
    } else {
      navigation.navigate('Cart');
    }
  } catch (error) {
    console.error('Error saving drink:', error);
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
    let url = `${getBaseURL()}/backend/generate/`;

    if (user_id) {
      url = `${getBaseURL()}/backend/generate/${user_id}/`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Error when trying to generate AI drink. Status: ${response.status} - ${errorText}`);
    }

    const drink = await response.json();

    // Pre-fill the form fields with the AI-generated drink
    setSoda(drink.SodaUsed ? [drink.SodaUsed] : []);
    setSyrups(drink.SyrupsUsed || []);
    setAddIns(drink.AddIns || []);
    setSize(drink.Size || '24oz');
    setIce('Regular');

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
  if (totalItems === 0) return layers;

  const addLayer = (name) => {
    if (!name) return;
    const meta = ingredientMeta[name.toLowerCase()];
    if (meta?.color) {
      layers.push({ color: meta.color, height: 100 / totalItems });
    }
  };

  soda.forEach(addLayer);
  syrups.forEach(addLayer);
  addins.forEach(addLayer);
  return layers;
};

const layers = getLayers(SodaUsed, SyrupsUsed, AddIns);

const makeStyles = (colors) => StyleSheet.create({
  wholePage: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pinnedTop: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewCard: {
    position: 'relative',
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  reviewMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  reviewPlaceholder: {
    fontSize: 12,
    color: colors.textPlaceholder,
    fontStyle: 'italic',
  },
  reviewRow: {
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
    lineHeight: 17,
  },
  reviewLabel: {
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  reviewValue: {
    color: colors.textPrimary,
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
    borderColor: colors.secondary,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  flavorTagText: {
    color: colors.secondary,
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
    color: colors.textPrimary,
    marginBottom: 16,
  },
  selectorSection: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 62,
  },
  tileButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tileEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tileLabelSelected: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  secondaryButtonText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginVertical: 16,
    color: colors.textPrimary,
  },
  navBarSpace: {
    marginBottom: 80,
  },
});

const styles = makeStyles(colors);

return (
  <View style={[styles.wholePage, insideTabContainer && { paddingBottom: 50 }]}>
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
        <TouchableOpacity onPress={saveDrink} style={[styles.pinnedButton, styles.secondaryButton, { flex: 0.5 }]}>
          <Icon name="heart-outline" size={22} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={addToCart} style={[styles.pinnedButton, styles.primaryButton]}>
          <Text style={styles.primaryButtonText}>
            {currentDrinkToEdit ? 'Save Changes' : 'Add to My Order'}
          </Text>
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
      <Text style={styles.pageTitle}>
        {currentDrinkToEdit ? 'Edit Your Drink' : 'Design Your Drink'}
      </Text>

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
        placeholderTextColor={colors.textPlaceholder}
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
        options={filterOptions(addInOptions)}
        onSelect={handleAddInSelection}
        isOpen={openDropdown.addins}
        setOpen={() => setOpenDropdown(prev => ({ ...prev, addins: !prev.addins }))}
        selectedValues={AddIns}
      />

      {/* Bottom spacing for NavBar */}
      {!insideTabContainer && <View style={styles.navBarSpace} />}
    </ScrollView>

    {!insideTabContainer && <NavBar />}
  </View>
);
};

export default CreateDrinkPage;
