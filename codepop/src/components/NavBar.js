import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const NavBar = () => {
  const navigation = useNavigation();

  const navItems = [
    { label: 'Home', icon: 'home-outline', route: 'GeneralHome' },
    { label: 'Design', icon: 'cafe-outline', route: 'CreateDrink' },
    { label: 'Cart', icon: 'cart-outline', route: 'Cart' },
    { label: 'Chat', icon: 'chatbubbles-outline', route: 'ComplaintsPage' },
    { label: 'Profile', icon: 'person-outline', route: 'Preferences' },
  ];

  return (
    <View style={styles.navbar}>
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.navButton}
          onPress={() => navigation.navigate(item.route)}
        >
          <Icon name={item.icon} size={24} color="#222831" />
          <Text style={styles.navLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    width: '100%',
    height: 80,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    color: '#222831',
    marginTop: 4,
  },
});

export default NavBar;
