import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Revenue } from './pages/Revenue';
import { Inventory } from './pages/Inventory';
import { OrderStats } from './pages/OrderStats';
import { SupplyRequests } from './pages/SupplyRequests';
import styles from './ManagerDashboard.module.css';

const PAGE_COMPONENTS = {
  overview: Overview,
  revenue: Revenue,
  inventory: Inventory,
  orders: OrderStats,
  requests: SupplyRequests,
};

export function ManagerDashboard() {
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
