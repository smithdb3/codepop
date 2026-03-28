import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Machines } from './pages/Machines';
import { Schedule } from './pages/Schedule';
import { Parts } from './pages/Parts';
import { Performance } from './pages/Performance';
import styles from './RepairDashboard.module.css';

const PAGE_COMPONENTS = {
  overview: Overview,
  machines: Machines,
  schedule: Schedule,
  parts: Parts,
  performance: Performance,
};

export function RepairDashboard() {
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
