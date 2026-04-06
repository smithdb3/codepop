import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { getBaseURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gif from './Gif';
import ingredientMeta from './Ingredients';
import Modal from 'react-native-modal';
import TabNavigationContext from '../context/TabNavigationContext';

const AIAlert = ({ isModalVisible, toggleModal, drinkDict }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tabNav = useContext(TabNavigationContext);
  const [selectedSize, setSelectedSize] = useState(drinkDict.Size || '24oz');
  const [selectedIce, setSelectedIce] = useState('Regular');

  const sizes = ['16oz', '24oz', '32oz'];
  const iceOptions = ['No Ice', 'Light', 'Regular', 'Extra'];

  const createObj = async (size, ice) => {
    try {
      const sodaUsed = Array.isArray(drinkDict.SodaUsed) && drinkDict.SodaUsed.length > 0 ? drinkDict.SodaUsed : [drinkDict.SodaUsed];
      const syrupsUsed = Array.isArray(drinkDict.SyrupsUsed) ? drinkDict.SyrupsUsed : [];
      const addIns = Array.isArray(drinkDict.AddIns) ? drinkDict.AddIns : [];

      const response = await fetch(`${getBaseURL()}/backend/drinks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: drinkDict.Name || 'AI Drink',
          SodaUsed: sodaUsed,
          SyrupsUsed: syrupsUsed,
          AddIns: addIns,
          Price: 2.0,
          User_Created: true,
          Size: size,
          Ice: ice.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create drink. Status:', response.status);
        console.error('Response Text:', errorText);
        throw new Error(`Failed to create drink: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const drinkID = data.DrinkID;
      const updatedList = [...currentList, drinkID];
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));

      console.log('created drink obj');
      return data;
    } catch (error) {
      console.error('Error in createObj:', error);
      throw error;
    }
  };

  const addToCart = async () => {
    try {
      await createObj(selectedSize, selectedIce);
      toggleModal();
      if (tabNav && tabNav.navigateToTab) {
        tabNav.navigateToTab(2); // Navigate to Cart tab
      } else {
        navigation.navigate('Cart');
      }
    } catch (error) {
      console.error('Error in addToCart:', error);
      Alert.alert('Error', 'Failed to add drink to cart. Please try again.');
    }
  };

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

  const sodaUsed = Array.isArray(drinkDict.SodaUsed) && drinkDict.SodaUsed.length > 0 ? drinkDict.SodaUsed : [drinkDict.SodaUsed];
  const syrupsUsed = Array.isArray(drinkDict.SyrupsUsed) ? drinkDict.SyrupsUsed : [];
  const addIns = Array.isArray(drinkDict.AddIns) ? drinkDict.AddIns : [];

  const layers = getLayers(sodaUsed, syrupsUsed, addIns);

  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={toggleModal}
      style={styles.modal}
      swipeToClose={true}
      swipeDirection={['down']}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      propagateSwipe={true}
    >
      <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Draggable Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.draggableHandle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{drinkDict.Name || 'Your AI Drink'}</Text>
          <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          {/* Ingredients Card + Gif */}
          <View style={[styles.ingredientsCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <View style={styles.ingredientsContent}>
              <Text style={[styles.ingredientLabel, { color: colors.textMuted }]}>Soda</Text>
              <Text style={[styles.ingredientValue, { color: colors.textPrimary }]}>{sodaUsed.join(', ')}</Text>

              <Text style={[styles.ingredientLabel, { color: colors.textMuted, marginTop: 12 }]}>Syrups</Text>
              <Text style={[styles.ingredientValue, { color: colors.textPrimary }]}>{syrupsUsed.length > 0 ? syrupsUsed.join(', ') : 'None'}</Text>

              <Text style={[styles.ingredientLabel, { color: colors.textMuted, marginTop: 12 }]}>Add-ins</Text>
              <Text style={[styles.ingredientValue, { color: colors.textPrimary }]}>{addIns.length > 0 ? addIns.join(', ') : 'None'}</Text>
            </View>

            <View style={styles.gifContainer}>
              <Gif layers={layers} width={80} height={120} />
            </View>
          </View>

          {/* Size Selector */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SIZE</Text>
            <View style={styles.optionsRow}>
              {sizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionChip,
                    selectedSize === size
                      ? [styles.optionChipSelected, { backgroundColor: colors.primary }]
                      : [styles.optionChipUnselected, { backgroundColor: colors.surface2, borderColor: colors.border }],
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: selectedSize === size ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ice Selector */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ICE</Text>
            <View style={styles.optionsRow}>
              {iceOptions.map((ice) => (
                <TouchableOpacity
                  key={ice}
                  style={[
                    styles.optionChip,
                    selectedIce === ice
                      ? [styles.optionChipSelected, { backgroundColor: colors.primary }]
                      : [styles.optionChipUnselected, { backgroundColor: colors.surface2, borderColor: colors.border }],
                  ]}
                  onPress={() => setSelectedIce(ice)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: selectedIce === ice ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {ice}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[styles.addToCartButton, { backgroundColor: colors.primary }]}
          onPress={addToCart}
        >
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 0,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  draggableHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  scrollContent: {
    marginBottom: 16,
  },
  scrollContentContainer: {
    paddingBottom: 8,
  },
  ingredientsCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  ingredientsContent: {
    flex: 1,
    marginRight: 16,
  },
  ingredientLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ingredientValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  gifContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  optionChipSelected: {
    borderWidth: 0,
  },
  optionChipUnselected: {
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  addToCartButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AIAlert;
