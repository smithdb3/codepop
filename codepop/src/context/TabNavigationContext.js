import React, { createContext } from 'react';

export const TabNavigationContext = createContext({
  activeTabIndex: 0,
  navigateToTab: () => {},
  shouldGenerateDrink: false,
  drinkToEdit: null,
  setDrinkToEdit: () => {},
});

export default TabNavigationContext;
