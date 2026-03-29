import React, { useState, useEffect } from 'react';
import { KPICard } from '../../super-admin/components/KPICard';
import { getAdminKPI } from '../../../api/users';
import styles from './DashboardHome.module.css';

export function DashboardHome() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setError(null);
        const data = await getAdminKPI();
        const kpiArray = [
          { id: 1, label: 'Total Users', value: data.total_users, trend: 'up', target: 500 },
          { id: 2, label: 'Active Users', value: data.active_users, trend: 'up', target: 400 },
          { id: 3, label: 'Disabled Users', value: data.disabled_users, trend: 'down', target: 50 },
          { id: 4, label: 'Managers', value: data.manager_count, trend: 'up', target: 20 },
        ];
        setKpis(kpiArray);
      } catch (error) {
        console.error('Failed to fetch KPI data:', error);
        setError('Failed to load KPI data. Check that you are logged in as an admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (loading) {
    return <div className={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.id} className={styles.kpiWrapper}>
            <KPICard label={kpi.label} value={kpi.value} trend={kpi.trend} target={kpi.target} />
          </div>
        ))}
      </div>
    </div>
  );
}
