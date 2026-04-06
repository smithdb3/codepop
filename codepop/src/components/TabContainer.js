import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, SafeAreaView, useWindowDimensions, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../theme';
import TabNavigationContext from '../context/TabNavigationContext';
import CodePopLogo from './CodePopLogo';
import NavBar from './NavBar';
import GeneralHomePage from '../pages/GeneralHomePage';
import CreateDrinkPage from '../pages/CreateDrinkPage';
import CartPage from '../pages/CartPage';
import ComplaintsPage from '../pages/ComplaintsPage';
import PreferencesPage from '../pages/PreferencesPage';
import PaymentPage from '../pages/PaymentPage';
import PostCheckout from '../pages/PostCheckout';

const TabContainer = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const TAB_COUNT = 5;

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [mountedTabs, setMountedTabs] = useState(new Set([0]));
  const [shouldGenerateDrink, setShouldGenerateDrink] = useState(false);
  const [drinkToEdit, setDrinkToEdit] = useState(null);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [checkoutHiding, setCheckoutHiding] = useState(false);
  const [postCheckoutStarted, setPostCheckoutStarted] = useState(false);
  const [postCheckoutMinimized, setPostCheckoutMinimized] = useState(false);

  const translateX = useSharedValue(0);
  const checkoutTranslateY = useSharedValue(screenHeight);
  const postCheckoutTranslateY = useSharedValue(screenHeight);

  const navigateToTab = useCallback(
    (index, options = {}) => {
      if (index === activeTabIndex) return;
      setActiveTabIndex(index);
      setMountedTabs((prev) => new Set([...prev, index]));
      if (options.generateDrink) {
        setShouldGenerateDrink(true);
      }
      translateX.value = withTiming(-(index * screenWidth), {
        duration: 200,
      });
    },
    [activeTabIndex, screenWidth, translateX]
  );

  const checkoutShouldShow = checkoutStarted && activeTabIndex === 2 && !checkoutHiding;
  const postCheckoutShouldShow = postCheckoutStarted && activeTabIndex === 2 && !postCheckoutMinimized;
  const showPeekTab = postCheckoutStarted && !postCheckoutShouldShow;

  useEffect(() => {
    checkoutTranslateY.value = withTiming(checkoutShouldShow ? 0 : screenHeight, { duration: 300 });
  }, [checkoutShouldShow]);

  useEffect(() => {
    postCheckoutTranslateY.value = withTiming(postCheckoutShouldShow ? 0 : screenHeight, { duration: 300 });
  }, [postCheckoutShouldShow]);

  const postCheckoutDragGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) {
          postCheckoutTranslateY.value = e.translationY;
        }
      })
      .onEnd((e) => {
        if (e.translationY > 120 || e.velocityY > 600) {
          postCheckoutTranslateY.value = withTiming(screenHeight, { duration: 200 });
          runOnJS(setPostCheckoutMinimized)(true);
        } else {
          postCheckoutTranslateY.value = withTiming(0, { duration: 200 });
        }
      }),
    []
  );

  const peekTabSwipeGesture = useMemo(() =>
    Gesture.Pan()
      .onEnd((e) => {
        if (e.translationY < -40 || e.velocityY < -300) {
          runOnJS(setPostCheckoutMinimized)(false);
          runOnJS(navigateToTab)(2);
        }
      }),
    [navigateToTab]
  );

  const showCheckout = useCallback(() => {
    setCheckoutStarted(true);
    navigateToTab(2);
  }, [navigateToTab]);

  const hideCheckout = useCallback(() => {
    setCheckoutHiding(true);
    setTimeout(() => {
      setCheckoutStarted(false);
      setCheckoutHiding(false);
    }, 300);
  }, []);

  const showPostCheckout = useCallback(() => {
    setCheckoutStarted(false);
    setPostCheckoutStarted(true);
    setPostCheckoutMinimized(false);
  }, []);

  const hidePostCheckout = useCallback(() => {
    setPostCheckoutStarted(false);
  }, []);

  const checkoutAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: checkoutTranslateY.value }],
  }));

  const postCheckoutAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: postCheckoutTranslateY.value }],
  }));

  // Reset shouldGenerateDrink flag after it's been used
  React.useEffect(() => {
    if (shouldGenerateDrink && activeTabIndex === 1) {
      const timer = setTimeout(() => {
        setShouldGenerateDrink(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [shouldGenerateDrink, activeTabIndex]);

  // Handle tab navigation from stack screens (e.g., NavBar on PaymentPage/PostCheckout)
  React.useEffect(() => {
    const initialTab = route?.params?.initialTab;
    if (typeof initialTab === 'number') {
      navigateToTab(initialTab);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab]);

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
    <TabNavigationContext.Provider value={{
      activeTabIndex, navigateToTab, shouldGenerateDrink, drinkToEdit, setDrinkToEdit,
      showCheckout, hideCheckout, showPostCheckout, hidePostCheckout,
    }}>
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

          {/* Checkout overlay — slides up over cart tab, persists when switching tabs */}
          {checkoutStarted && (
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }, checkoutAnimStyle]}>
              <PaymentPage
                onSuccess={() => showPostCheckout()}
                isVisible={checkoutShouldShow}
                onClose={() => hideCheckout()}
              />
            </Animated.View>
          )}

          {/* PostCheckout overlay */}
          {postCheckoutStarted && (
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }, postCheckoutAnimStyle]}>
              {/* Drag handle — swipe down to minimize */}
              <GestureDetector gesture={postCheckoutDragGesture}>
                <View style={styles.dragHandleContainer}>
                  <View style={styles.dragHandlePill} />
                </View>
              </GestureDetector>
              <PostCheckout
                onDone={() => { hidePostCheckout(); navigateToTab(0); }}
              />
            </Animated.View>
          )}
        </View>

        {/* Peek tab — floats above NavBar when post-checkout is minimized or on another tab */}
        {showPeekTab && (
          <GestureDetector gesture={Gesture.Race(peekTabSwipeGesture, Gesture.Tap().onEnd(() => {
            runOnJS(setPostCheckoutMinimized)(false);
            runOnJS(navigateToTab)(2);
          }))}>
            <View style={[styles.peekTab, { backgroundColor: colors.primary }]}>
              <View style={styles.peekTabPill} />
              <Text style={styles.peekTabText}>Order Confirmed</Text>
            </View>
          </GestureDetector>
        )}

        {/* Fixed NavBar */}
        <NavBar />
      </SafeAreaView>
    </TabNavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 10,
  },
  dragHandlePill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
  peekTab: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  peekTabPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  peekTabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TabContainer;
