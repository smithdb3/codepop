import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import styles from './Machines.module.css';
import { getMachines, getMachineRepairLogs } from '../../../api/machines';
import { getRepairParts } from '../../../api/repairParts';

export function Machines({ onNavigate }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterParts, setFilterParts] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [drawerMachine, setDrawerMachine] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details');
  const [noteText, setNoteText] = useState('');
  const [expandedHistoryRow, setExpandedHistoryRow] = useState(null);
  const [machines, setMachines] = useState([]);
  const [repairLogs, setRepairLogs] = useState({});
  const [repairParts, setRepairParts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status mapping from backend to frontend
  const statusMap = {
    NORMAL: 'operational',
    WARNING: 'degraded',
    ERROR: 'critical',
    OUT_OF_ORDER: 'critical',
    SCHEDULE_SERVICE: 'degraded',
    REPAIR_START: 'degraded',
    REPAIR_END: 'operational',
  };

  // Fetch all machines on component mount
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await getMachines();
        setMachines(data);
      } catch (error) {
        console.error('Failed to fetch machines:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  // Fetch repair logs when drawer opens
  useEffect(() => {
    if (drawerMachine && drawerTab === 'history' && !repairLogs[drawerMachine.id]) {
      const fetchLogs = async () => {
        try {
          const logs = await getMachineRepairLogs(drawerMachine.id);
          setRepairLogs((prev) => ({ ...prev, [drawerMachine.id]: logs }));
        } catch (error) {
          console.error('Failed to fetch repair logs:', error);
        }
      };
      fetchLogs();
    }
  }, [drawerMachine, drawerTab, repairLogs]);

  // Fetch repair parts when drawer opens
  useEffect(() => {
    if (drawerMachine && drawerTab === 'parts' && repairParts.length === 0) {
      const fetchParts = async () => {
        try {
          const parts = await getRepairParts();
          setRepairParts(parts);
        } catch (error) {
          console.error('Failed to fetch repair parts:', error);
        }
      };
      fetchParts();
    }
  }, [drawerMachine, drawerTab, repairParts]);

  // Transform machines data for display
  const displayMachines = machines.map((m) => ({
    ...m,
    storeName: `Store ${m.store_id}`,
    status: statusMap[m.status] || 'operational',
    downtimeDuration: null, // Can be calculated from last_status_change if needed
    lastService: m.last_status_change ? new Date(m.last_status_change).toLocaleDateString() : 'Unknown',
    serial: m.serial_number || 'N/A',
  }));

  // Get unique stores and models for filter dropdowns
  const stores = [...new Map(displayMachines.map((m) => [m.store_id, m])).values()];
  const models = [...new Set(displayMachines.map((m) => m.model))].filter(Boolean).sort();

  // Filter logic
  const filteredMachines = useMemo(() => {
    return displayMachines.filter((m) => {
      const matchesPill = statusFilter === 'all' || m.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        m.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.model && m.model.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = !filterStatus || m.status === filterStatus;
      const matchesStore = !filterStore || m.store_id === Number(filterStore);
      const matchesType = !filterType || m.model === filterType;
      const matchesParts = !filterParts || (filterParts === 'pending' ? m.status === 'parts_pending' : m.status !== 'parts_pending');
      return (
        matchesPill && matchesSearch && matchesStatus && matchesStore && matchesType && matchesParts
      );
    });
  }, [statusFilter, searchTerm, filterStatus, filterStore, filterType, filterParts, displayMachines]);

  // Handle checkbox selection
  const toggleRowSelect = (machineId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(machineId)) {
      newSelected.delete(machineId);
    } else {
      newSelected.add(machineId);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredMachines.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredMachines.map((m) => m.machine_id)));
    }
  };

  // Table columns
  const columns = [
    {
      key: 'select',
      label: '☐',
      sortable: false,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.machine_id)}
          onChange={() => toggleRowSelect(row.machine_id)}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'machineInfo',
      label: 'Machine ID & Store',
      sortable: true,
      render: (_, row) => (
        <>
          <strong>{row.machine_id}</strong>
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.storeName}
          </span>
        </>
      ),
    },
    {
      key: 'model',
      label: 'Model / Serial',
      sortable: true,
      render: (_, row) => (
        <>
          {row.model}
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.serial}
          </span>
        </>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <RepairStatusBadge status={val} />,
    },
    {
      key: 'downtimeDuration',
      label: 'Downtime',
      sortable: true,
      render: (val) =>
        val ? (
          val
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
        ),
    },
    {
      key: 'lastService',
      label: 'Last Service',
      sortable: true,
    },
    {
      key: 'priorityScore',
      label: 'Priority',
      sortable: true,
    },
    {
      key: 'revenueImpact',
      label: 'Revenue Impact',
      sortable: true,
      render: (val, row) =>
        row.status !== 'operational' ? `$${val}/hr` : '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => setDrawerMachine(row)}
            title="Details"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            🔍
          </button>
          <button
            onClick={() => setDrawerMachine(row)}
            title="Start Repair"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            🔧
          </button>
          <button
            title="Escalate"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ⬆️
          </button>
        </div>
      ),
    },
  ];

  // Handle Escape key to close drawer
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setDrawerMachine(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Machines — Chicago Region</h1>
        <button
          className={styles.planRouteBtn}
          disabled={selectedRows.size === 0}
        >
          Plan Route for Selected
        </button>
      </div>

      {/* Quick-Filter Pills */}
      <div className={styles.pillRow}>
        <button
          className={`${styles.pill} ${statusFilter === 'all' ? styles.active : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({displayMachines.length})
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'critical' ? styles.active : ''}`}
          onClick={() => setStatusFilter('critical')}
        >
          <span className={styles.pillBadge} style={{ background: '#FEE2E2' }}>
            {displayMachines.filter((m) => m.status === 'critical').length}
          </span>{' '}
          Critical
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'degraded' ? styles.active : ''}`}
          onClick={() => setStatusFilter('degraded')}
        >
          <span className={styles.pillBadge} style={{ background: '#FEF3C7' }}>
            {displayMachines.filter((m) => m.status === 'degraded').length}
          </span>{' '}
          Degraded
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'operational' ? styles.active : ''}`}
          onClick={() => setStatusFilter('operational')}
        >
          <span className={styles.pillBadge} style={{ background: '#DCFCE7' }}>
            {displayMachines.filter((m) => m.status === 'operational').length}
          </span>{' '}
          Operational
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'parts_pending' ? styles.active : ''}`}
          onClick={() => setStatusFilter('parts_pending')}
        >
          <span className={styles.pillBadge} style={{ background: '#E0E7FF' }}>
            {displayMachines.filter((m) => m.status === 'parts_pending').length}
          </span>{' '}
          Parts Pending
        </button>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by machine ID, model, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Status</option>
            <option value="critical">Critical</option>
            <option value="degraded">Degraded</option>
            <option value="operational">Operational</option>
            <option value="parts_pending">Offline</option>
          </select>
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Store</option>
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                {s.storeName}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Machine Type</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Urgency</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="overdue">Overdue</option>
            <option value="maintenance">Maintenance Only</option>
          </select>
          <select
            value={filterParts}
            onChange={(e) => setFilterParts(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Parts Availability</option>
            <option value="has">Has Parts</option>
            <option value="pending">Waiting on Parts</option>
          </select>
          {(filterStatus || filterStore || filterType || filterUrgency || filterParts) && (
            <button
              className={styles.clearFilters}
              onClick={() => {
                setFilterStatus('');
                setFilterStore('');
                setFilterType('');
                setFilterUrgency('');
                setFilterParts('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={filteredMachines}
          searchable={false}
          rowsPerPage={25}
          onRowClick={(row) => setDrawerMachine(row)}
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className={styles.bulkBar}>
          <div className={styles.bulkBarContent}>
            <span className={styles.bulkLabel}>
              {selectedRows.size} machine{selectedRows.size !== 1 ? 's' : ''} selected
            </span>
            <button className={styles.primaryBtn}>
              Plan Route for Selected
            </button>
            <button
              className={styles.ghostBtnText}
              onClick={() => setSelectedRows(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Machine Detail Drawer */}
      {drawerMachine && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setDrawerMachine(null)}
          />
          <div className={styles.drawer}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <div>
                <div className={styles.machineId}>{drawerMachine.machine_id}</div>
                <div className={styles.machineModel}>{drawerMachine.model || 'Unknown Model'}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <RepairStatusBadge status={drawerMachine.status} />
                <button
                  className={styles.closeBtn}
                  onClick={() => setDrawerMachine(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.drawerActions}>
              <button className={styles.actionBtn}>Start Repair</button>
              <button className={styles.actionBtn}>Mark Complete</button>
              <button className={styles.actionBtn}>Request Parts</button>
              <button className={styles.actionBtn}>Escalate</button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              {['details', 'history', 'parts', 'notes'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${drawerTab === tab ? styles.active : ''}`}
                  onClick={() => setDrawerTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabPane}>
              {drawerTab === 'details' && (
                <div>
                  <h4 className={styles.sectionHeading}>Machine Info</h4>
                  <div className={styles.infoSection}>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Serial Number:</span>
                      <span>{drawerMachine.serial_number || 'N/A'}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Model:</span>
                      <span>{drawerMachine.model || 'N/A'}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Location:</span>
                      <span>{drawerMachine.location || 'N/A'}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Repair State:</span>
                      <span>{drawerMachine.repair_state || 'N/A'}</span>
                    </div>
                    {drawerMachine.estimated_completion && (
                      <div className={styles.infoPair}>
                        <span className={styles.infoLabel}>Est. Completion:</span>
                        <span>
                          {new Date(
                            drawerMachine.estimated_completion
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Priority Score:</span>
                      <span>{drawerMachine.priority_score || 0}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Revenue Impact:</span>
                      <span>${drawerMachine.revenue_impact || 0}/hr</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Last Updated:</span>
                      <span>{drawerMachine.last_status_change ? new Date(drawerMachine.last_status_change).toLocaleString() : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'history' && (
                <div>
                  <h4 className={styles.sectionHeading}>Repair History</h4>
                  {repairLogs[drawerMachine.id]?.length > 0 ? (
                    repairLogs[drawerMachine.id].map((entry, idx) => (
                      <div
                        key={idx}
                        className={styles.historyEntry}
                        onClick={() =>
                          setExpandedHistoryRow(
                            expandedHistoryRow === idx ? null : idx
                          )
                        }
                      >
                        <div className={styles.historyHeader}>
                          <div>
                            <strong>{entry.issue_type}</strong>
                            <div className={styles.historyMeta}>
                              {new Date(entry.date).toLocaleDateString()} • {entry.technician_name || 'Unknown'} • {entry.duration_minutes}m
                            </div>
                          </div>
                          <span
                            style={{
                              color:
                                entry.outcome === 'resolved'
                                  ? '#10B981'
                                  : '#F59E0B',
                            }}
                          >
                            {entry.outcome === 'resolved' ? '✓' : '⚠️'}
                          </span>
                        </div>
                        {expandedHistoryRow === idx && (
                          <div className={styles.historyDetails}>
                            <div className={styles.historyDetail}>
                              <strong>Diagnosis:</strong> {entry.diagnosis || 'N/A'}
                            </div>
                            <div className={styles.historyDetail}>
                              <strong>Steps:</strong> {entry.steps_text || 'N/A'}
                            </div>
                            {entry.parts_replaced?.length > 0 && (
                              <div className={styles.historyDetail}>
                                <strong>Parts Replaced:</strong>{' '}
                                {entry.parts_replaced.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyMessage}>No repair history</p>
                  )}
                </div>
              )}

              {drawerTab === 'parts' && (
                <div>
                  <h4 className={styles.sectionHeading}>Common Parts</h4>
                  {repairParts.filter((p) => p.machine_model === drawerMachine.model).length > 0 ? (
                    <div>
                      {repairParts
                        .filter((p) => p.machine_model === drawerMachine.model)
                        .map((part) => (
                          <div key={part.id} className={styles.partItem}>
                            <div>
                              <strong>{part.part_name}</strong>
                              <div className={styles.partMeta}>{part.part_number}</div>
                            </div>
                            <div className={styles.partStatus}>
                              <StockBadge status={part.stock_status} />
                              {part.qty_available > 0 && (
                                <span className={styles.qty}>
                                  Qty: {part.qty_available}
                                </span>
                              )}
                              {part.eta && (
                                <span className={styles.eta}>ETA: {new Date(part.eta).toLocaleDateString()}</span>
                              )}
                            </div>
                            <button className={styles.partRequestBtn}>
                              Request
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className={styles.emptyMessage}>
                      No parts information available for this machine model
                    </p>
                  )}
                </div>
              )}

              {drawerTab === 'notes' && (
                <div>
                  <h4 className={styles.sectionHeading}>Internal Notes</h4>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className={styles.noteTextarea}
                  />
                  <button
                    className={styles.primaryBtn}
                    onClick={() => {
                      console.log(
                        'Note saved for',
                        drawerMachine.machine_id,
                        ':',
                        noteText
                      );
                      setNoteText('');
                    }}
                  >
                    Save Note
                  </button>
                  <h4 className={styles.sectionHeading} style={{ marginTop: '20px' }}>
                    Previous Notes
                  </h4>
                  {drawerMachine.last_note && (
                    <div className={styles.noteItem}>
                      <div className={styles.noteContent}>
                        {drawerMachine.last_note}
                      </div>
                      <div className={styles.noteTime}>
                        {drawerMachine.last_status_change ? new Date(drawerMachine.last_status_change).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RepairStatusBadge({ status }) {
  const config = {
    critical: { bg: '#FEE2E2', text: '#DC2626', label: 'Critical Down' },
    degraded: { bg: '#FEF3C7', text: '#D97706', label: 'Degraded' },
    operational: { bg: '#DCFCE7', text: '#16A34A', label: 'Operational' },
    parts_pending: { bg: '#E0E7FF', text: '#4F46E5', label: 'Parts Pending' },
  };

  const config_status = config[status] || config.operational;

  return (
    <span
      style={{
        background: config_status.bg,
        color: config_status.text,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {config_status.label}
    </span>
  );
}

function StockBadge({ status }) {
  const config = {
    in_stock: { bg: '#DCFCE7', text: '#16A34A', label: 'In Stock' },
    order_pending: { bg: '#FEF3C7', text: '#D97706', label: 'Order Pending' },
    back_order: { bg: '#FEE2E2', text: '#DC2626', label: 'Back-order' },
    in_transit: { bg: '#DBEAFE', text: '#0369A1', label: 'In Transit' },
    delivered: { bg: '#DCFCE7', text: '#16A34A', label: 'Delivered' },
  };

  const badge_config = config[status] || config.in_stock;

  return (
    <span
      style={{
        background: badge_config.bg,
        color: badge_config.text,
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {badge_config.label}
    </span>
  );
}
