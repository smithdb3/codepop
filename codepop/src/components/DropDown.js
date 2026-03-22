import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const DropDown = ({ title, options = [], onSelect, isOpen, setOpen, selectedValues = [] }) => {
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
        <Icon name={isOpen ? "caret-up-outline" : "caret-down-outline"} size={24} color="#08D9D6" />
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginVertical: 8,
  },
  headerOpen: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF2E63',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222831',
  },
  content: {
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#FF2E63',
    borderColor: '#FF2E63',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222831',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

export default DropDown;
