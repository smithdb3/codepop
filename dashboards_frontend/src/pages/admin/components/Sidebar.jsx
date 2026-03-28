import React from 'react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  // Overview
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
  // User Management
  { id: 'users', label: 'Users', icon: '👥', section: 'User Management' },
  { id: 'managers', label: 'Managers', icon: '👔', section: 'User Management' },
  // System
  { id: 'roles', label: 'Roles & Permissions', icon: '🔐', section: 'System' },
  { id: 'audit', label: 'Audit Trail', icon: '📋', section: 'System' },
];

export function Sidebar({ activePage, onNavigate, isCollapsed, isMobileOpen, onMobileClose }) {
  const sections = ['Overview', 'User Management', 'System'];

  return (
    <>
      {isMobileOpen && <div className={styles.mobileBackdrop} onClick={onMobileClose} />}
      <nav className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        {sections.map((section) => {
          const itemsInSection = NAV_ITEMS.filter((item) => item.section === section);
          return itemsInSection.length > 0 ? (
            <div key={section}>
              <div className={styles.sectionLabel}>{section}</div>
              <ul className={styles.navList}>
                {itemsInSection.map((item) => (
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
            </div>
          ) : null;
        })}
      </nav>
    </>
  );
}
