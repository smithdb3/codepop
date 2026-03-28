import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KPICard } from '../../super-admin/components/KPICard';
import { ORDER_STATS } from '../mockData';
import styles from './OrderStats.module.css';

export function OrderStats() {
  const [dateRange, setDateRange] = useState('30');

  // Reverse popular items for horizontal bar chart (bottom to top)
  const reversedPopularItems = [...ORDER_STATS.popularItems].reverse();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Order Statistics</h1>
        <div className={styles.dateRangeSelector}>
          <button
            className={`${styles.rangeBtn} ${dateRange === '30' ? styles.rangeBtnActive : ''}`}
            onClick={() => setDateRange('30')}
          >
            Last 30 Days
          </button>
          <button
            className={`${styles.rangeBtn} ${dateRange === '90' ? styles.rangeBtnActive : ''}`}
            onClick={() => setDateRange('90')}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* Performance Metrics KPI Row */}
      <div className={styles.kpiRow}>
        <KPICard
          label={ORDER_STATS.kpis.orderVolumeWeek.label}
          value={ORDER_STATS.kpis.orderVolumeWeek.value}
          delta={ORDER_STATS.kpis.orderVolumeWeek.delta}
          deltaPositive={ORDER_STATS.kpis.orderVolumeWeek.deltaPositive}
        />
        <KPICard
          label={ORDER_STATS.kpis.orderVolumeMonth.label}
          value={ORDER_STATS.kpis.orderVolumeMonth.value}
          delta={ORDER_STATS.kpis.orderVolumeMonth.delta}
          deltaPositive={ORDER_STATS.kpis.orderVolumeMonth.deltaPositive}
        />
        <KPICard
          label={ORDER_STATS.kpis.fulfillmentTime.label}
          value={ORDER_STATS.kpis.fulfillmentTime.value}
          delta={ORDER_STATS.kpis.fulfillmentTime.delta}
          deltaPositive={ORDER_STATS.kpis.fulfillmentTime.deltaPositive}
        />
        <KPICard
          label={ORDER_STATS.kpis.satisfactionScore.label}
          value={ORDER_STATS.kpis.satisfactionScore.value}
          delta={ORDER_STATS.kpis.satisfactionScore.delta}
          deltaPositive={ORDER_STATS.kpis.satisfactionScore.deltaPositive}
        />
      </div>

      {/* Popular Items Chart */}
      <div className={styles.chartCard}>
        <h2 className={styles.chartTitle}>Popular Items</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={reversedPopularItems}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis type="number" stroke="#666" />
            <YAxis dataKey="name" type="category" stroke="#666" width={115} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
            <Bar dataKey="orders" fill="#FF2E63" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Time-Based Trends */}
      <div className={styles.trendsContainer}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Peak Hours</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={ORDER_STATS.peakHours} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="hour" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
              <Area
                type="monotone"
                dataKey="count"
                fill="#FF2E63"
                stroke="#FF2E63"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Peak Days</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ORDER_STATS.peakDays} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
              <Bar dataKey="count" fill="#FF2E63" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
