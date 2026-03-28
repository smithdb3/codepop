import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Stores } from './pages/Stores';
import { Inventory } from './pages/Inventory';
import { Deliveries } from './pages/Deliveries';
import { SupplyRequests } from './pages/SupplyRequests';
import styles from './LogisticsDashboard.module.css';

const PAGE_COMPONENTS = {
  overview: Overview,
  stores: Stores,
  inventory: Inventory,
  deliveries: Deliveries,
  requests: SupplyRequests,
};

export function LogisticsDashboard() {
  const [activePage, setActivePage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ActivePageComponent = PAGE_COMPONENTS[activePage];

  return (
    <div className={styles.dashboard}>
      <TopBar
        onToggleSidebar={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMobileMenuOpen={mobileMenuOpen}
      />
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <main
        className={`${styles.main} ${sidebarCollapsed ? styles.mainCollapsed : ''}`}
      >
        <ActivePageComponent onNavigate={setActivePage} />
      </main>
    </div>
  );
}
