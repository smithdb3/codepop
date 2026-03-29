import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { getAuditLogs } from '../../../api/auditlogs';
import styles from './AuditTrail.module.css';

export function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(getPastDate(30));
  const [dateTo, setDateTo] = useState(getTodayDate());
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');

  function getPastDate(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {
          start: dateFrom,
          end: dateTo,
        };
        if (actionFilter !== 'all') params.action = actionFilter;
        if (actorFilter !== 'all') params.actor = actorFilter;

        const data = await getAuditLogs(params);
        setLogs(data.results || data);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [dateFrom, dateTo, actionFilter, actorFilter]);

  const filteredData = useMemo(() => {
    return logs;
  }, [logs]);

  const actions = Array.from(new Set(logs.map((log) => log.action)));
  const actors = Array.from(new Set(logs.map((log) => log.actor)));

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (timestamp) => new Date(timestamp).toLocaleString()
    },
    {
      key: 'actor',
      label: 'Actor',
      sortable: true,
      render: (actor, row) => (
        <div className={styles.actorCell}>
          <span className={styles.actorName}>{actor}</span>
          <span className={styles.actorRole}>{row.actor_role}</span>
        </div>
      ),
    },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'target_repr', label: 'Target', sortable: true },
    {
      key: 'result',
      label: 'Status',
      sortable: true,
      render: (result) => (
        <span
          className={styles.statusBadge}
          style={{
            color: result === 'success' ? '#10B981' : '#EF4444',
            backgroundColor:
              result === 'success'
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(239,68,68,0.12)',
          }}
        >
          {result === 'success' ? '✓' : '✗'} {result.charAt(0).toUpperCase() + result.slice(1)}
        </span>
      ),
    },
  ];

  if (loading) {
    return <div className={styles.container}><p>Loading...</p></div>;
  }

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
