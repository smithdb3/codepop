import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { AUDIT_LOGS } from '../mockData';
import styles from './AuditLogs.module.css';

export function AuditLogs() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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

      <DataTable columns={logColumns} data={AUDIT_LOGS} searchable={true} rowsPerPage={25} />
    </div>
  );
}
