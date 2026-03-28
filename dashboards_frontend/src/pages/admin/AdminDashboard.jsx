import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { UserManagement } from './pages/UserManagement';
import { ManagerAccounts } from './pages/ManagerAccounts';
import { RolesPermissions } from './pages/RolesPermissions';
import { AuditTrail } from './pages/AuditTrail';
import styles from './AdminDashboard.module.css';

const PAGE_COMPONENTS = {
  dashboard: DashboardHome,
  users: UserManagement,
  managers: ManagerAccounts,
  roles: RolesPermissions,
  audit: AuditTrail,
};

export function AdminDashboard() {
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
