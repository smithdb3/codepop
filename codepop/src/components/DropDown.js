import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme';

const DropDown = ({ title, options = [], onSelect, isOpen, setOpen, selectedValues = [] }) => {
  const { colors } = useTheme();

  const makeStyles = (colors) => StyleSheet.create({
    container: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginVertical: 8,
    },
    headerOpen: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    content: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 8,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    chipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

  const styles = makeStyles(colors);

  const toggleItemSelection = (item) => {
    onSelect(item);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={setOpen} style={[
        styles.header,
        isOpen && styles.headerOpen,
      ]}>
        <Text style={styles.headerText}>{title}</Text>
        <Icon name={isOpen ? "caret-up-outline" : "caret-down-outline"} size={24} color={colors.secondary} />
      </TouchableOpacity>

      {/* Content */}
      {isOpen && options.length > 0 && (
        <View style={styles.content}>
          <View style={styles.chipContainer}>
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value.toLowerCase());
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                  onPress={() => toggleItemSelection(option.value)}
                >
                  <Text style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}>
                    {option.emoji} {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

export default DropDown;
