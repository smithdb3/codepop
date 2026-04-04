import React, { createContext } from 'react';

export const TabNavigationContext = createContext({
  activeTabIndex: -1,
  navigateToTab: () => {},
  shouldGenerateDrink: false,
  drinkToEdit: null,
  setDrinkToEdit: () => {},
  showCheckout: () => {},
  hideCheckout: () => {},
  showPostCheckout: () => {},
  hidePostCheckout: () => {},
});

export default TabNavigationContext;
