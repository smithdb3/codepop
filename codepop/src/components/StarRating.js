import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const StarRating = ({ onRatingSelected, disabled = false, initialRating = 0, emptyColor = '#C7C7CC' }) => {
  const [rating, setRating] = useState(initialRating);

  const handleRating = (star) => {
    if (disabled) return;
    setRating(star);
    onRatingSelected(star);
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handleRating(star)}
          disabled={disabled}
        >
          <Icon
            name="star"
            size={32}
            color={star <= rating ? '#D30C7B' : emptyColor}
            style={styles.star}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 5,
  },
});

export default StarRating;
