import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { getBaseURL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gif from './Gif';
import { sodaOptions, syrupOptions, AddInOptions } from './Ingredients';
import Modal from 'react-native-modal';

const AIAlert = ({ isModalVisible, toggleModal, drinkDict }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [selectedSize, setSelectedSize] = useState(drinkDict.Size || '24oz');

  const sizes = ['16oz', '24oz', '32oz'];

  const createObj = async (size) => {
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
          Name: 'AI drink',
          SodaUsed: sodaUsed,
          SyrupsUsed: syrupsUsed,
          AddIns: addIns,
          Price: 2.0,
          User_Created: true,
          Size: size,
          Ice: 'regular',
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
      await createObj(selectedSize);
      toggleModal();
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error in addToCart:', error);
      Alert.alert('Error', 'Failed to add drink to cart. Please try again.');
    }
  };

  const getLayers = (soda, syrups, addins) => {
    const layers = [];
    const totalItems = soda.length + syrups.length + addins.length;

    soda.forEach((sodaName) => {
      const sodaOption = sodaOptions.find((opt) => opt.label === sodaName);
      if (sodaOption) {
        layers.push({ color: sodaOption.color, height: 100 / totalItems });
      }
    });

    syrups.forEach((syrupName) => {
      const syrupOption = syrupOptions.find((opt) => opt.label === syrupName);
      if (syrupOption) {
        layers.push({ color: syrupOption.color, height: 100 / totalItems });
      }
    });

    addins.forEach((addinName) => {
      const addInOption = AddInOptions.find((opt) => opt.label === addinName);
      if (addInOption) {
        layers.push({ color: addInOption.color, height: 100 / totalItems });
      }
    });
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
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        {/* Header with close button */}
        <View style={styles.headerRow}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Your Drink</Text>
          <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Size Selector */}
        <View style={styles.sizeSection}>
          <Text style={[styles.sizeLabel, { color: colors.textPrimary }]}>Select Size</Text>
          <View style={styles.sizeRow}>
            {sizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeButton,
                  selectedSize === size
                    ? [styles.sizeButtonSelected, { backgroundColor: colors.primary }]
                    : [styles.sizeButtonUnselected, { borderColor: colors.border }],
                ]}
                onPress={() => setSelectedSize(size)}
              >
                <Text
                  style={[
                    styles.sizeButtonText,
                    { color: selectedSize === size ? '#fff' : colors.textPrimary },
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Body: Ingredients and Gif */}
        <View style={styles.body}>
          {/* Ingredients List */}
          <View style={styles.textNbuttons}>
            <View style={[styles.ingredientsBox, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.ingredientsText, { color: colors.textPrimary }]}>
                Soda: {sodaUsed.join(', ')}
              </Text>
              <Text style={[styles.ingredientsText, { color: colors.textPrimary }]}>
                Syrups: {syrupsUsed.join(', ')}
              </Text>
              <Text style={[styles.ingredientsText, { color: colors.textPrimary }]}>
                Add-ins: {addIns.join(', ')}
              </Text>
            </View>
          </View>

          {/* Drink GIF */}
          <View style={styles.graphicContainer}>
            <Gif layers={layers} />
          </View>
        </View>

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
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sizeSection: {
    marginBottom: 20,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  sizeButtonSelected: {
    borderColor: 'transparent',
  },
  sizeButtonUnselected: {
    backgroundColor: 'transparent',
  },
  sizeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textNbuttons: {
    flex: 1,
    paddingRight: 16,
  },
  ingredientsBox: {
    borderRadius: 10,
    padding: 12,
  },
  ingredientsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  graphicContainer: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AIAlert;
