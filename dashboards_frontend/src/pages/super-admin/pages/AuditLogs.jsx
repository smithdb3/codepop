import React, { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { getAuditLogs } from '../../../api/auditlogs';
import styles from './AuditLogs.module.css';

function getPastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: getPastDate(30), end: getTodayDate() });

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {};
        if (dateRange.start) params.start = dateRange.start;
        if (dateRange.end) params.end = dateRange.end;

        const data = await getAuditLogs(params);
        const logsData = data.results || data;

        // Map API response to table format
        const mappedLogs = logsData.map(log => ({
          id: log.id,
          who: log.actor,
          what: log.action,
          when: new Date(log.timestamp).toLocaleString(),
          where: log.target_repr,
          result: log.result,
        }));

        setLogs(mappedLogs);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [dateRange]);

  const logColumns = [
    { key: 'who', label: 'Who', sortable: true },
    { key: 'what', label: 'What', sortable: true },
    { key: 'when', label: 'When', sortable: true },
    { key: 'where', label: 'Where', sortable: true },
    {
      key: 'result',
      label: 'Result',
      sortable: true,
      render: (val) => <StatusBadge status={val} text={val === 'success' ? 'Success' : 'Failed'} />,
    },
  ];

  if (loading) {
    return <div className={styles.page}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Audit Logs</div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Audit Logs</h1>
          <button className={styles.exportBtn}>Export CSV</button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label>Date Range</label>
          <div className={styles.dateInputs}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      <DataTable columns={logColumns} data={logs} searchable={true} rowsPerPage={25} />
    </div>
  );
}
