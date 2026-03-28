import React from 'react';
import { StatusBadge } from './StatusBadge';
import styles from './RegionalStatusGrid.module.css';

export function RegionalStatusGrid({ regions, onRegionClick }) {
  return (
    <div className={styles.grid}>
      {regions.map((region) => (
        <div
          key={region.id}
          className={styles.card}
          onClick={() => onRegionClick && onRegionClick(region)}
        >
          <div className={styles.regionName}>{region.name}</div>
          <div className={styles.storesLine}>
            <span className={styles.label}>{region.storesOnline}/{region.storesTotal} online</span>
          </div>
          <div className={styles.alertsLine}>
            {region.alerts > 0 && <span className={styles.alertBadge}>⚠️ {region.alerts}</span>}
          </div>
          <div className={styles.revenueLine}>
            <span className={styles.label}>${region.revenue.toLocaleString()}</span>
          </div>
          <div className={styles.statusLine}>
            <StatusBadge status={region.status} text={region.status.charAt(0).toUpperCase() + region.status.slice(1)} />
          </div>
        </div>
      ))}
    </div>
  );
}
