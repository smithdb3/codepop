import React, { useState, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { ADMIN_AUDIT } from '../mockData';
import styles from './AuditTrail.module.css';

export function AuditTrail() {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-28');
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');

  const filteredData = useMemo(() => {
    let result = ADMIN_AUDIT;

    if (actionFilter !== 'all') {
      result = result.filter((log) => log.action === actionFilter);
    }

    if (actorFilter !== 'all') {
      result = result.filter((log) => log.actor === actorFilter);
    }

    return result;
  }, [actionFilter, actorFilter]);

  const actions = Array.from(new Set(ADMIN_AUDIT.map((log) => log.action)));
  const actors = Array.from(new Set(ADMIN_AUDIT.map((log) => log.actor)));

  const columns = [
    { key: 'timestamp', label: 'Timestamp', sortable: true },
    {
      key: 'actor',
      label: 'Actor',
      sortable: true,
      render: (actor, row) => (
        <div className={styles.actorCell}>
          <span className={styles.actorName}>{actor}</span>
          <span className={styles.actorRole}>{row.actorRole}</span>
        </div>
      ),
    },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'target', label: 'Target', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <span
          className={styles.statusBadge}
          style={{
            color: status === 'success' ? '#10B981' : '#EF4444',
            backgroundColor:
              status === 'success'
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(239,68,68,0.12)',
          }}
        >
          {status === 'success' ? '✓' : '✗'} {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Audit Trail</h1>

      <div className={styles.toolbar}>
        <div className={styles.dateRange}>
          <label>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={styles.dateInput}
          />
          <label>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Actors</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>

        <div className={styles.spacer} />

        <button className={styles.secondaryBtn}>Export CSV</button>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable columns={columns} data={filteredData} searchable={false} rowsPerPage={50} />
      </div>
    </div>
  );
}
