import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  REVENUE_CHART_DATA,
  ORDERS_TREND_DATA,
  INVENTORY_CHART_DATA,
  MACHINE_UPTIME_CHART_DATA,
} from '../mockData';
import styles from './ReportsAnalytics.module.css';

export function ReportsAnalytics() {
  const ChartCard = ({ title, data, dataKey, color }) => (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.exportButtons}>
          <button className={styles.exportBtn}>CSV</button>
          <button className={styles.exportBtn}>PDF</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Reports & Analytics</div>
        <h1 className={styles.title}>Reports & Analytics</h1>
      </div>

      <div className={styles.grid}>
        <ChartCard
          title="Revenue Report (30 days)"
          data={REVENUE_CHART_DATA}
          dataKey="revenue"
          color="#FF2E63"
        />
        <ChartCard
          title="Order Trends (30 days)"
          data={ORDERS_TREND_DATA}
          dataKey="orders"
          color="#08D9D6"
        />
        <ChartCard
          title="Inventory Trends (30 days)"
          data={INVENTORY_CHART_DATA}
          dataKey="percentage"
          color="#F59E0B"
        />
        <ChartCard
          title="Machine Uptime (30 days)"
          data={MACHINE_UPTIME_CHART_DATA}
          dataKey="uptime"
          color="#10B981"
        />
      </div>
    </div>
  );
}
