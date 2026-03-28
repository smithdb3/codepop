import React from 'react';
import styles from './KPICard.module.css';

export function KPICard({ label, value, trend, target }) {
  const isPositiveTrend = trend >= 0;
  const trendIcon = isPositiveTrend ? '↑' : '↓';
  const trendColor = isPositiveTrend ? '#10B981' : '#EF4444';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.label}>{label}</div>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.footer}>
        <span style={{ color: trendColor, fontWeight: 'var(--font-weight-semibold)' }}>
          {trendIcon} {Math.abs(trend)}%
        </span>
        {target && <span className={styles.target}>Target: {target}</span>}
      </div>
    </div>
  );
}
