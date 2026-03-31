import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import {
  getMachines, getMachineHistory, getMachineParts,
  getMachineNotes, createMachineNote, uploadMachinePhoto, deleteMachinePhoto
} from '../../../api/machines';
import styles from './Machines.module.css';

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

  // API data and loading states
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError] = useState(null);
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [drawerParts, setDrawerParts] = useState([]);
  const [drawerNotes, setDrawerNotes] = useState([]);
  const [drawerPhotos, setDrawerPhotos] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Load machines on mount
  useEffect(() => {
    setMachinesLoading(true);
    getMachines()
      .then((data) => {
        setMachines(data || []);
        setMachinesLoading(false);
      })
      .catch((err) => {
        setMachinesError(err.message);
        setMachinesLoading(false);
      });
  }, []);

  // Load drawer sub-resources when drawer opens
  useEffect(() => {
    if (!drawerMachine) return;
    setDrawerLoading(true);
    Promise.all([
      getMachineHistory(drawerMachine.id),
      getMachineParts(drawerMachine.id),
      getMachineNotes(drawerMachine.id),
    ])
      .then(([history, parts, notes]) => {
        setDrawerHistory(history || []);
        setDrawerParts(parts || []);
        setDrawerNotes(notes || []);
        setDrawerLoading(false);
      })
      .catch(() => setDrawerLoading(false));
  }, [drawerMachine]);

  // Get unique stores and models for filter dropdowns
  const stores = [...new Map(machines.map((m) => [m.store_id, m])).values()];
  const models = [...new Set(machines.map((m) => m.model))].sort();

  // Filter logic
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesPill = statusFilter === 'all' || m.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || m.status === filterStatus;
      const matchesStore = !filterStore || m.store_id === Number(filterStore);
      const matchesType = !filterType || m.model === filterType;
      const matchesParts = !filterParts || (filterParts === 'pending' ? m.status === 'parts_pending' : !m.status === 'parts_pending');
      return (
        matchesPill && matchesSearch && matchesStatus && matchesStore && matchesType && matchesParts
      );
    });
  }, [statusFilter, searchTerm, filterStatus, filterStore, filterType, filterParts, machines]);

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
      setSelectedRows(new Set(filteredMachines.map((m) => m.id)));
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
          checked={selectedRows.has(row.id)}
          onChange={() => toggleRowSelect(row.id)}
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
          <strong>{row.id}</strong>
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.store_name}
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
      key: 'downtime_duration',
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
      key: 'last_service',
      label: 'Last Service',
      sortable: true,
    },
    {
      key: 'priority_score',
      label: 'Priority',
      sortable: true,
    },
    {
      key: 'revenue_impact',
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
          All ({MACHINES.length})
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'critical' ? styles.active : ''}`}
          onClick={() => setStatusFilter('critical')}
        >
          <span className={styles.pillBadge} style={{ background: '#FEE2E2' }}>
            {MACHINES.filter((m) => m.status === 'critical').length}
          </span>{' '}
          Critical
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'degraded' ? styles.active : ''}`}
          onClick={() => setStatusFilter('degraded')}
        >
          <span className={styles.pillBadge} style={{ background: '#FEF3C7' }}>
            {MACHINES.filter((m) => m.status === 'degraded').length}
          </span>{' '}
          Degraded
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'operational' ? styles.active : ''}`}
          onClick={() => setStatusFilter('operational')}
        >
          <span className={styles.pillBadge} style={{ background: '#DCFCE7' }}>
            {MACHINES.filter((m) => m.status === 'operational').length}
          </span>{' '}
          Operational
        </button>
        <button
          className={`${styles.pill} ${statusFilter === 'parts_pending' ? styles.active : ''}`}
          onClick={() => setStatusFilter('parts_pending')}
        >
          <span className={styles.pillBadge} style={{ background: '#E0E7FF' }}>
            {MACHINES.filter((m) => m.status === 'parts_pending').length}
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
              <option key={s.storeId} value={s.storeId}>
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
        {machinesLoading ? (
          <p>Loading machines...</p>
        ) : machinesError ? (
          <p style={{ color: 'red' }}>Error: {machinesError}</p>
        ) : (
          <DataTable
            columns={columns}
            data={filteredMachines}
            searchable={false}
            rowsPerPage={25}
            onRowClick={(row) => setDrawerMachine(row)}
          />
        )}
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
                <div className={styles.machineId}>{drawerMachine.id}</div>
                <div className={styles.machineModel}>{drawerMachine.model}</div>
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
              {['details', 'history', 'parts', 'notes', 'photos'].map((tab) => (
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
                      <span className={styles.infoLabel}>Install Date:</span>
                      <span>{drawerMachine.install_date}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Warranty:</span>
                      <span>{drawerMachine.warranty_status}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Assigned Tech:</span>
                      <span>{drawerMachine.assigned_tech || 'Unassigned'}</span>
                    </div>
                    <div className={styles.infoPair}>
                      <span className={styles.infoLabel}>Repair State:</span>
                      <span>{drawerMachine.repair_state}</span>
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
                      <span className={styles.infoLabel}>Last Update:</span>
                      <span>{drawerMachine.last_update_time}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'history' && (
                <div>
                  <h4 className={styles.sectionHeading}>Repair History</h4>
                  {drawerHistory.length > 0 ? (
                    drawerHistory.map((entry, idx) => (
                      <div
                        key={entry.id}
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
                              {entry.date} • {entry.technician} • {entry.duration}
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
                              <strong>Diagnosis:</strong> {entry.diagnosis}
                            </div>
                            <div className={styles.historyDetail}>
                              <strong>Steps:</strong> {entry.steps_text}
                            </div>
                            {entry.parts_replaced.length > 0 && (
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
                  {drawerParts.length > 0 ? (
                    <div>
                      {drawerParts.map((part) => (
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
                              <span className={styles.eta}>ETA: {part.eta}</span>
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
                      No parts information available
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
                      if (!noteText.trim()) return;
                      createMachineNote(drawerMachine.id, noteText)
                        .then((newNote) => {
                          setDrawerNotes((prev) => [newNote, ...prev]);
                          setNoteText('');
                        })
                        .catch((err) => console.error('Failed to save note:', err));
                    }}
                  >
                    Save Note
                  </button>
                  <h4 className={styles.sectionHeading} style={{ marginTop: '20px' }}>
                    Previous Notes
                  </h4>
                  {drawerNotes.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>No notes yet</p>
                  ) : (
                    drawerNotes.map((note) => (
                      <div key={note.id} className={styles.noteItem}>
                        <div className={styles.noteContent}>{note.content}</div>
                        <div className={styles.noteTime}>
                          {note.author} — {new Date(note.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === 'photos' && (
                <div>
                  <h4 className={styles.sectionHeading}>Machine Photos</h4>
                  {drawerPhotos.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>No photos uploaded</p>
                  ) : (
                    drawerPhotos.map((photo) => (
                      <div key={photo.id} style={{ marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                        <img src={photo.url} alt="machine" style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '8px' }} />
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                          {photo.uploaded_by} — {new Date(photo.created_at).toLocaleString()}
                        </div>
                        <button
                          onClick={() =>
                            deleteMachinePhoto(drawerMachine.id, photo.id)
                              .then(() => setDrawerPhotos((prev) => prev.filter((p) => p.id !== photo.id)))
                              .catch((err) => console.error('Failed to delete photo:', err))
                          }
                          style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <h4 className={styles.sectionHeading}>Upload Photo</h4>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        uploadMachinePhoto(drawerMachine.id, file)
                          .then((photo) => {
                            setDrawerPhotos((prev) => [photo, ...prev]);
                            e.target.value = '';
                          })
                          .catch((err) => console.error('Failed to upload photo:', err));
                      }}
                    />
                  </div>
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
