import React from 'react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'stores', label: 'Stores', icon: '🏪' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'deliveries', label: 'Deliveries', icon: '🚚' },
  { id: 'requests', label: 'Supply Requests', icon: '📋' },
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
