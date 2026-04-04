import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../theme';

const DrinkNameModal = ({ visible, initialName, title, onConfirm, onDismiss }) => {
  const { colors } = useTheme();
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (visible) {
      setLocalName(initialName || '');
    }
  }, [visible, initialName]);

  const handleConfirm = () => {
    onConfirm(localName.trim());
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onDismiss}
      style={styles.modal}
      swipeDirection={['down']}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeToClose={true}
      avoidKeyboard={true}
    >
      <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Draggable Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.draggableHandle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Label */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Give your drink a name</Text>

        {/* Text Input */}
        <TextInput
          value={localName}
          onChangeText={setLocalName}
          placeholder="e.g. Tropical Sunrise"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          autoFocus={true}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
        />

        {/* Confirm Button */}
        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.confirmButtonText}>Save Name</Text>
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
    paddingBottom: 32,
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
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DrinkNameModal;
