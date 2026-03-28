import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { RegionsStores } from './pages/RegionsStores';
import { SupplyHubs } from './pages/SupplyHubs';
import { UserManagement } from './pages/UserManagement';
import { AIConfiguration } from './pages/AIConfiguration';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { AuditLogs } from './pages/AuditLogs';
import { SystemSettings } from './pages/SystemSettings';
import { HelpDocs } from './pages/HelpDocs';
import styles from './SuperAdminDashboard.module.css';

const PAGE_COMPONENTS = {
  dashboard: DashboardHome,
  regions: RegionsStores,
  hubs: SupplyHubs,
  users: UserManagement,
  ai: AIConfiguration,
  reports: ReportsAnalytics,
  audit: AuditLogs,
  settings: SystemSettings,
  help: HelpDocs,
};

export function SuperAdminDashboard() {
  const [activePage, setActivePage] = useState('dashboard');
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
      <main className={`${styles.main} ${sidebarCollapsed ? styles.mainCollapsed : ''}`}>
        <ActivePageComponent />
      </main>
    </div>
  );
}
