import React from 'react';
import styles from './AlertsPanel.module.css';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export function AlertsPanel({ alerts }) {
  const sortedAlerts = [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      warning: '🟡',
      info: '🟢',
    };
    return icons[severity] || '•';
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Active Alerts</h3>
        <span className={styles.count}>{alerts.length}</span>
      </div>
      <div className={styles.alertList}>
        {sortedAlerts.length > 0 ? (
          sortedAlerts.map((alert) => (
            <div key={alert.id} className={`${styles.alertRow} ${styles[alert.severity]}`}>
              <span className={styles.icon}>{getSeverityIcon(alert.severity)}</span>
              <div className={styles.content}>
                <div className={styles.message}>{alert.message}</div>
                <div className={styles.details}>{alert.details}</div>
                <div className={styles.meta}>
                  <span>{alert.region}</span>
                  <span>{alert.time}</span>
                </div>
              </div>
              <button className={styles.dismissBtn} aria-label="Dismiss alert">
                ✕
              </button>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>No active alerts</div>
        )}
      </div>
    </div>
  );
}
