import React, { useState, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { Modal } from '../../super-admin/components/Modal';
import { StatusBadge } from '../../super-admin/components/StatusBadge';
import { ADMIN_USERS } from '../mockData';
import styles from './UserManagement.module.css';

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: '', location: '', password: '' });

  const filteredData = useMemo(() => {
    let result = ADMIN_USERS;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((user) => user.status === filterStatus);
    }

    return result;
  }, [searchTerm, filterStatus]);

  const statusColors = {
    active: { dot: '🟢', label: 'Active', bg: 'rgba(16,185,129,0.12)' },
    disabled: { dot: '🟡', label: 'Disabled', bg: 'rgba(245,158,11,0.12)' },
    deleted: { dot: '⚫', label: 'Deleted', bg: 'rgba(107,114,128,0.12)' },
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'location', label: 'Location/Region', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'lastLogin', label: 'Last Login', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => {
        const config = statusColors[status];
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{config.dot}</span>
            <span>{config.label}</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className={styles.actionButtons}>
          {row.status === 'active' && (
            <>
              <button className={styles.iconBtn} title="Edit">✏️</button>
              <button className={styles.iconBtn} title="Disable">🚫</button>
              <button className={styles.iconBtn} title="Make Manager">👔</button>
              <button className={styles.iconBtn} title="Delete">🗑️</button>
            </>
          )}
          {row.status === 'disabled' && (
            <>
              <button className={styles.iconBtn} title="Edit">✏️</button>
              <button className={styles.iconBtn} title="Enable">✅</button>
              <button className={styles.iconBtn} title="Delete">🗑️</button>
            </>
          )}
          {row.status === 'deleted' && <span>View only</span>}
        </div>
      ),
    },
  ];

  const handleAddUser = () => {
    setShowAddModal(false);
    setFormData({ name: '', email: '', role: '', location: '', password: '' });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Management</h1>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <div className={styles.filterTabs}>
          {['all', 'active', 'disabled', 'deleted'].map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${filterStatus === tab ? styles.active : ''}`}
              onClick={() => setFilterStatus(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
          + Add User
        </button>
      </div>

      {selectedRows.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.bulkText}>
            <strong>{selectedRows.size} selected</strong>
          </span>
          <button className={styles.secondaryBtn}>Disable Selected</button>
          <button className={styles.secondaryBtn}>Reset Passwords</button>
          <button className={styles.secondaryBtn}>Export</button>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <DataTable columns={columns} data={filteredData} searchable={false} rowsPerPage={25} />
      </div>

      {showAddModal && (
        <Modal
          title="Add User"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUser}
        >
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={styles.formInput}
            >
              <option>Select a role</option>
              <option>Super Admin</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
              <option>Repair Staff</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Location/Region</label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={styles.formInput}
            >
              <option>Select a region</option>
              <option>Chicago</option>
              <option>Dallas</option>
              <option>New Jersey</option>
              <option>Atlanta</option>
              <option>Phoenix</option>
              <option>Seattle</option>
              <option>Logan</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={styles.formInput}
              placeholder="Generate or enter password"
            />
          </div>
          <div className={styles.modalButtons}>
            <button className={styles.primaryBtn} onClick={handleAddUser}>
              Create
            </button>
            <button className={styles.secondaryBtn} onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
