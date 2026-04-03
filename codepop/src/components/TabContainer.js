import React, { useState, useCallback } from 'react';
import { View, Dimensions, SafeAreaView, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import TabNavigationContext from '../context/TabNavigationContext';
import CodePopLogo from './CodePopLogo';
import NavBar from './NavBar';
import GeneralHomePage from '../pages/GeneralHomePage';
import CreateDrinkPage from '../pages/CreateDrinkPage';
import CartPage from '../pages/CartPage';
import ComplaintsPage from '../pages/ComplaintsPage';
import PreferencesPage from '../pages/PreferencesPage';

const TabContainer = ({ navigation }) => {
  const { colors } = useTheme();
  const screenWidth = useWindowDimensions().width;
  const TAB_COUNT = 5;

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [mountedTabs, setMountedTabs] = useState(new Set([0]));
  const [shouldGenerateDrink, setShouldGenerateDrink] = useState(false);

  const translateX = useSharedValue(0);

  const navigateToTab = useCallback(
    (index, options = {}) => {
      if (index === activeTabIndex) return;
      setActiveTabIndex(index);
      setMountedTabs((prev) => new Set([...prev, index]));
      if (options.generateDrink) {
        setShouldGenerateDrink(true);
      }
      translateX.value = withTiming(-(index * screenWidth), {
        duration: 250,
      });
    },
    [activeTabIndex, screenWidth, translateX]
  );

  // Reset shouldGenerateDrink flag after it's been used
  React.useEffect(() => {
    if (shouldGenerateDrink && activeTabIndex === 1) {
      const timer = setTimeout(() => {
        setShouldGenerateDrink(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [shouldGenerateDrink, activeTabIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const headerStyle = {
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentContainerStyle = {
    flex: 1,
    overflow: 'hidden',
  };

  const tabScreens = [
    { component: GeneralHomePage, key: 'home' },
    { component: CreateDrinkPage, key: 'design' },
    { component: CartPage, key: 'cart' },
    { component: ComplaintsPage, key: 'complaints' },
    { component: PreferencesPage, key: 'preferences' },
  ];

  return (
    <TabNavigationContext.Provider value={{ activeTabIndex, navigateToTab, shouldGenerateDrink }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Fixed Header */}
        <View style={headerStyle}>
          <CodePopLogo size={28} />
        </View>

        {/* Animated Content Area */}
        <View style={contentContainerStyle}>
          <Animated.View
            style={[
              {
                width: TAB_COUNT * screenWidth,
                height: '100%',
                flexDirection: 'row',
              },
              animatedStyle,
            ]}
          >
            {tabScreens.map((tabScreen, index) => {
              const Screen = tabScreen.component;
              return (
                <View
                  key={tabScreen.key}
                  style={{
                    width: screenWidth,
                    height: '100%',
                  }}
                >
                  {mountedTabs.has(index) ? (
                    <Screen
                      insideTabContainer
                      isFocused={activeTabIndex === index}
                      navigation={navigation}
                    />
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        </View>

        {/* Fixed NavBar */}
        <NavBar />
      </SafeAreaView>
    </TabNavigationContext.Provider>
  );
};

export default TabContainer;
