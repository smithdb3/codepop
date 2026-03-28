import React, { useState } from 'react';
import { MANAGER, ALERTS } from '../mockData';
import styles from './Overview.module.css';

export function Overview({ onNavigate }) {
  const [dismissedAlerts, setDismissedAlerts] = useState({});

  const toggleDismissAlert = (id) => {
    setDismissedAlerts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const quickAccessCards = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'Dashboard summary and key metrics',
      icon: '🏠',
    },
    {
      id: 'revenue',
      title: 'Revenue',
      description: 'Revenue analytics and trends',
      icon: '💰',
    },
    {
      id: 'inventory',
      title: 'Inventory',
      description: 'Stock levels and management',
      icon: '📦',
    },
    {
      id: 'orders',
      title: 'Order Stats',
      description: 'Order analytics and performance',
      icon: '📊',
    },
    {
      id: 'requests',
      title: 'Supply Requests',
      description: 'Supply request tracking',
      icon: '🚚',
    },
  ];

  const visibleAlerts = ALERTS.filter((a) => !dismissedAlerts[a.id]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back, {MANAGER.firstName}!</h1>
        <p className={styles.subtitle}>
          Store: {MANAGER.storeName} | {MANAGER.storeLocation}
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Access</h2>
        <div className={styles.quickAccessGrid}>
          {quickAccessCards.map((card) => (
            <button
              key={card.id}
              className={styles.quickCard}
              onClick={() => onNavigate(card.id)}
            >
              <div className={styles.cardIcon}>{card.icon}</div>
              <div className={styles.cardContent}>
                <div className={styles.cardTitle}>{card.title}</div>
                <div className={styles.cardDescription}>{card.description}</div>
              </div>
              <div className={styles.cardArrow}>→</div>
            </button>
          ))}
        </div>
      </div>

      {visibleAlerts.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Alerts</h2>
          <div className={styles.alertsList}>
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={styles.alertItem}
                style={{
                  borderLeftColor:
                    alert.severity === 'critical'
                      ? '#EF4444'
                      : alert.severity === 'warning'
                        ? '#F59E0B'
                        : '#10B981',
                }}
              >
                <div className={styles.alertBadge}
                  style={{
                    backgroundColor:
                      alert.severity === 'critical'
                        ? '#EF4444'
                        : alert.severity === 'warning'
                          ? '#F59E0B'
                          : '#10B981',
                  }}
                >
                  {alert.severity === 'critical' ? '!' : alert.severity === 'warning' ? '⚠' : 'ℹ'}
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertMessage}>{alert.message}</div>
                  <div className={styles.alertTime}>{alert.timestamp}</div>
                </div>
                <button
                  className={styles.dismissBtn}
                  onClick={() => toggleDismissAlert(alert.id)}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
