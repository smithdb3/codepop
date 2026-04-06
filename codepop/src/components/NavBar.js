import React, { useContext } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme';
import TabNavigationContext from '../context/TabNavigationContext';

const NavBar = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tabNav = useContext(TabNavigationContext);

  const navItems = [
    { label: 'Home', icon: 'home-outline', route: 'GeneralHome' },
    { label: 'Design', icon: 'cafe-outline', route: 'CreateDrink' },
    { label: 'Cart', icon: 'cart-outline', route: 'Cart' },
    { label: 'Chat', icon: 'chatbubbles-outline', route: 'ComplaintsPage' },
    { label: 'Profile', icon: 'person-outline', route: 'Preferences' },
  ];

  const styles = StyleSheet.create({
    navbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: colors.navbarBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.textPrimary,
      marginTop: 4,
    },
  });

  const handlePress = (item, index) => {
    if (tabNav && tabNav.navigateToTab) {
      tabNav.navigateToTab(index);
    } else {
      navigation.navigate('GeneralHome', { initialTab: index });
    }
  };

  const isActive = (index) => {
    return tabNav && tabNav.activeTabIndex === index;
  };

  return (
    <View style={styles.navbar}>
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.navButton}
          onPress={() => handlePress(item, index)}
        >
          <Icon
            name={item.icon}
            size={24}
            color={isActive(index) ? colors.primary : colors.textPrimary}
          />
          <Text style={styles.navLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default NavBar;
