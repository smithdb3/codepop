import React, { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { ALERTS } from '../mockData';
import styles from './TopBar.module.css';

export function TopBar({ onToggleSidebar, isMobileMenuOpen }) {
  const { logout, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const firstName = user?.firstName || localStorage.getItem('cp_first_name') || 'Manager';

  // Get top 5 unread alerts
  const unreadAlerts = ALERTS.filter((a) => !a.dismissed).slice(0, 5);

  return (
    <div className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onToggleSidebar} aria-label="Toggle menu">
          ☰
        </button>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>CP</div>
          <h2 className={styles.title}>Manager Dashboard</h2>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.notificationContainer}>
          <button
            className={styles.notificationBtn}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            🔔
            {unreadAlerts.length > 0 && (
              <span className={styles.notificationBadge}>{unreadAlerts.length}</span>
            )}
          </button>
          {showNotifications && (
            <div className={styles.notificationFlyout}>
              <div className={styles.flyoutTitle}>Alerts</div>
              {unreadAlerts.length > 0 ? (
                <div>
                  {unreadAlerts.map((alert) => (
                    <div key={alert.id} className={styles.flyoutItem}>
                      <span
                        className={styles.severityDot}
                        style={{
                          backgroundColor:
                            alert.severity === 'critical'
                              ? '#EF4444'
                              : alert.severity === 'warning'
                                ? '#F59E0B'
                                : '#10B981',
                        }}
                      />
                      <div className={styles.alertContent}>
                        <div className={styles.alertMessage}>{alert.message}</div>
                        <div className={styles.alertTime}>{alert.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noAlerts}>No new alerts</div>
              )}
            </div>
          )}
        </div>

        <span className={styles.userName}>{firstName}</span>
        <button className={styles.logoutBtn} onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
