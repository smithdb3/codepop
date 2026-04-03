import React, { createContext } from 'react';

export const TabNavigationContext = createContext({
  activeTabIndex: 0,
  navigateToTab: () => {},
  shouldGenerateDrink: false,
});

export default TabNavigationContext;
