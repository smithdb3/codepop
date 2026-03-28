import React, { useState, useEffect } from 'react';
import { KPICard } from '../components/KPICard';
import { RegionalStatusGrid } from '../components/RegionalStatusGrid';
import { AlertsPanel } from '../components/AlertsPanel';
import { REGIONS, KPI_METRICS, ALERTS, LATENCY_CHART_DATA, ORDER_VOLUME_CHART_DATA } from '../mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './DashboardHome.module.css';

export function DashboardHome() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Simulate auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard</div>
        <h1 className={styles.title}>System Overview</h1>
      </div>

      {/* KPI Metrics Row */}
      <div className={styles.kpiRow}>
        {KPI_METRICS.map((metric) => (
          <KPICard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
            target={metric.target}
          />
        ))}
      </div>

      {/* Regional Status Grid + Alerts Panel */}
      <div className={styles.gridSection}>
        <div className={styles.regionsContainer}>
          <h2 className={styles.sectionTitle}>Regional Status</h2>
          <RegionalStatusGrid regions={REGIONS} />
        </div>
        <div className={styles.alertsContainer}>
          <AlertsPanel alerts={ALERTS} />
        </div>
      </div>

      {/* Real-Time Status Board */}
      <div className={styles.statusBoard}>
        <div className={styles.statusCard}>
          <div className={styles.statusIndicator}>✓</div>
          <div className={styles.statusContent}>
            <div className={styles.statusLabel}>NETWORK STATUS</div>
            <div className={styles.statusValue}>HEALTHY</div>
            <div className={styles.statusDetail}>Uptime: 99.9% (12 days)</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Network Latency (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={LATENCY_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="latency"
                stroke={getComputedStyle(document.documentElement).getPropertyValue('--color-primary')}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Order Volume (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ORDER_VOLUME_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="orders"
                stroke={getComputedStyle(document.documentElement).getPropertyValue('--color-secondary')}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
