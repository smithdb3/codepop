import React, { useState, useEffect } from 'react';
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
import styles from './Performance.module.css';
import { getMachines, getMachineRepairLogs } from '../../../api/machines';

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
  const [machines, setMachines] = useState([]);
  const [repairLogs, setRepairLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch machines and aggregate repair logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const machinesData = await getMachines();
        setMachines(machinesData);

        // Fetch repair logs for all machines
        const allLogs = [];
        for (const machine of machinesData) {
          try {
            const logs = await getMachineRepairLogs(machine.id);
            allLogs.push(...logs);
          } catch (error) {
            console.error(`Failed to fetch logs for machine ${machine.machine_id}:`, error);
          }
        }
        setRepairLogs(allLogs);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derive KPIs from repair logs
  const completedRepairs = repairLogs.filter((log) => log.outcome === 'resolved').length;
  const avgRepairTime = repairLogs.length > 0
    ? Math.round(repairLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / repairLogs.length)
    : 0;
  const avgRepairTimeStr = avgRepairTime > 60
    ? `${Math.floor(avgRepairTime / 60)}h ${avgRepairTime % 60}m`
    : `${avgRepairTime}m`;

  const onTimePct = 90; // Placeholder - would need schedule data
  const firstTimeFixPct = repairLogs.length > 0
    ? Math.round((completedRepairs / repairLogs.length) * 100)
    : 0;
  const downtimePrevented = machines
    .reduce((sum, m) => sum + parseFloat(m.revenue_impact || 0), 0)
    .toFixed(0);

  // Aggregate repairs over time (by day)
  const repairsOverTime = repairLogs.reduce((acc, log) => {
    const dateKey = new Date(log.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const existing = acc.find((item) => item.date === dateKey);
    if (existing) {
      existing.repairs += 1;
    } else {
      acc.push({ date: dateKey, repairs: 1 });
    }
    return acc;
  }, []).slice(-7); // Last 7 days

  // Aggregate repair types
  const repairTypesMap = repairLogs.reduce((acc, log) => {
    const type = log.issue_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const repairTypes = Object.entries(repairTypesMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Format repair history for table (join with machine data)
  const repairHistory = repairLogs
    .map((log) => {
      const machine = machines.find((m) => m.id === log.machine);
      return {
        id: log.id,
        date: new Date(log.date).toLocaleDateString(),
        machineId: machine?.machine_id || 'Unknown',
        location: machine?.location || 'Unknown',
        issueType: log.issue_type,
        duration: `${log.duration_minutes}m`,
        outcome: log.outcome,
        rating: null,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);

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
            value={completedRepairs}
            trend={5}
            target={50}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#08D9D6' }}>
          <KPICard
            label="Avg Repair Time"
            value={avgRepairTimeStr}
            trend={-2}
            target="1h 30m"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#F59E0B' }}>
          <KPICard
            label="On-Time %"
            value={`${onTimePct}%`}
            trend={3}
            target="95%"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#10B981' }}>
          <KPICard
            label="First-Time Fix %"
            value={`${firstTimeFixPct}%`}
            trend={1}
            target="90%"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#8B5CF6' }}>
          <KPICard
            label="Downtime Prevented"
            value={`$${downtimePrevented}`}
            trend={8}
            target="$15,000"
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#EC4899' }}>
          <KPICard
            label="Total Repairs"
            value={repairLogs.length}
            trend={0}
            target="100"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Repairs Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={repairsOverTime.length > 0 ? repairsOverTime : [{ date: 'No Data', repairs: 0 }]}>
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
                data={repairTypes.length > 0 ? repairTypes : [{ name: 'No Data', value: 1 }]}
                dataKey="value"
                nameKey="name"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={3}
                label={false}
              >
                {(repairTypes.length > 0 ? repairTypes : [{ name: 'No Data', value: 1 }]).map((_, i) => (
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
          data={repairHistory}
          searchable={true}
          rowsPerPage={25}
        />
      </div>
    </div>
  );
}
