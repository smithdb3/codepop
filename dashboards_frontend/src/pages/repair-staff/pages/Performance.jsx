import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KPICard } from '../../super-admin/components/KPICard';
import { DataTable } from '../../super-admin/components/DataTable';
import {
  PERFORMANCE_KPIs,
  REPAIRS_OVER_TIME,
  REPAIR_TYPES,
  REPAIR_HISTORY,
} from '../mockData';
import styles from './Performance.module.css';

const CHART_COLORS = [
  '#FF2E63',
  '#08D9D6',
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
];

export function Performance({ onNavigate }) {
  const [timeRange, setTimeRange] = useState('week');

  // Table columns for repair history
  const historyColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
    },
    {
      key: 'machineInfo',
      label: 'Machine ID & Location',
      sortable: true,
      render: (_, row) => (
        <>
          <strong>{row.machineId}</strong>
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.location}
          </span>
        </>
      ),
    },
    {
      key: 'issueType',
      label: 'Issue Type',
      sortable: true,
    },
    {
      key: 'duration',
      label: 'Duration',
      sortable: true,
    },
    {
      key: 'outcome',
      label: 'Outcome',
      sortable: true,
      render: (val) => (
        <span
          style={{
            color: val === 'resolved' ? '#10B981' : '#F59E0B',
            fontSize: '18px',
          }}
        >
          {val === 'resolved' ? '✓' : '⚠️'}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (val) => (
        <span style={{ color: '#F59E0B' }}>
          {val ? '★'.repeat(val) + '☆'.repeat(5 - val) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: () => (
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="View Details"
        >
          🔍
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Performance</h1>
        <div className={styles.timeRangeGroup}>
          {['week', 'month', 'last30'].map((range) => (
            <button
              key={range}
              className={`${styles.timeRangeBtn} ${
                timeRange === range ? styles.active : ''
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range === 'week'
                ? 'This Week'
                : range === 'month'
                  ? 'This Month'
                  : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#FF2E63' }}>
          <KPICard
            label="Repairs Completed"
            value={PERFORMANCE_KPIs.repairsCompleted}
            trend={5}
            target={50}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#08D9D6' }}>
          <KPICard
            label="Avg Repair Time"
            value={PERFORMANCE_KPIs.avgRepairTime}
            trend={-2}
            target="1h 30m"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#F59E0B' }}>
          <KPICard
            label="On-Time %"
            value={`${PERFORMANCE_KPIs.onTimePct}%`}
            trend={3}
            target="95%"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#10B981' }}>
          <KPICard
            label="First-Time Fix %"
            value={`${PERFORMANCE_KPIs.firstTimeFixPct}%`}
            trend={1}
            target="90%"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#8B5CF6' }}>
          <KPICard
            label="Downtime Prevented"
            value={PERFORMANCE_KPIs.downtimePrevented}
            trend={8}
            target="$15,000"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#EC4899' }}>
          <KPICard
            label="Team Rank"
            value={PERFORMANCE_KPIs.teamRank}
            trend={0}
            target="1st"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Repairs Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={REPAIRS_OVER_TIME}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="repairs"
                stroke="#FF2E63"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Repair Types Breakdown</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={REPAIR_TYPES}
                dataKey="value"
                nameKey="name"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={3}
                label={false}
              >
                {REPAIR_TYPES.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Repair History Table */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>Repair History (Last 30)</h3>
        <DataTable
          columns={historyColumns}
          data={REPAIR_HISTORY}
          searchable={true}
          rowsPerPage={25}
        />
      </div>
    </div>
  );
}
