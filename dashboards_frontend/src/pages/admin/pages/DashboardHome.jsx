import React from 'react';
import { KPICard } from '../../super-admin/components/KPICard';
import { ADMIN_KPI } from '../mockData';
import styles from './DashboardHome.module.css';

export function DashboardHome() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.kpiGrid}>
        {ADMIN_KPI.map((kpi) => (
          <div key={kpi.id} className={styles.kpiWrapper}>
            <KPICard label={kpi.label} value={kpi.value} trend={kpi.trend} target={kpi.target} />
          </div>
        ))}
      </div>
    </div>
  );
}
