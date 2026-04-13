import React from 'react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'regions', label: 'Regions & Stores', icon: '🏪' },
  { id: 'hubs', label: 'Supply Hubs', icon: '📦' },
  { id: 'users', label: 'User Management', icon: '👥' },
  { id: 'ai', label: 'AI Configuration', icon: '🤖' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📊' },
  { id: 'audit', label: 'Audit Logs', icon: '📋' },
  { id: 'network', label: 'Network Tests', icon: '🌐' },
  { id: 'settings', label: 'System Settings', icon: '⚙️' },
  { id: 'help', label: 'Help & Documentation', icon: '❓' },
];

export function Sidebar({ activePage, onNavigate, isCollapsed, isMobileOpen, onMobileClose }) {
  return (
    <>
      {isMobileOpen && <div className={styles.mobileBackdrop} onClick={onMobileClose} />}
      <nav className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
