import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import styles from './TopBar.module.css';

export function TopBar({ onToggleSidebar, isMobileMenuOpen }) {
  const { logout } = useAuth();
  const firstName = localStorage.getItem('cp_first_name') || 'Admin';

  return (
    <div className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onToggleSidebar} aria-label="Toggle menu">
          ☰
        </button>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>CP</div>
          <h2 className={styles.title}>Super Admin Dashboard</h2>
        </div>
        <div className={styles.lastUpdated}>Updated 2 min ago</div>
      </div>

      <div className={styles.right}>
        <span className={styles.statusBadge}>
          <span className={styles.statusDot}>🟢</span>
          All Systems Operational
        </span>
        <span className={styles.userName}>{firstName}</span>
        <button className={styles.logoutBtn} onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
