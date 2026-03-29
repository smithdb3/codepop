import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { Modal } from '../../super-admin/components/Modal';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, disableAdminUser, enableAdminUser } from '../../../api/users';
import { getRoles } from '../../../api/roles';
import styles from './UserManagement.module.css';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', role_id: '', region_id: '', password: '' });

  // Fetch users and roles on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [usersData, rolesData] = await Promise.all([
          getAdminUsers(),
          getRoles(),
        ]);
        setUsers(usersData.results || usersData);
        setRoles(rolesData.results || rolesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load data. Check that you are logged in as an admin.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let result = users;

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
  }, [users, searchTerm, filterStatus]);

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
    { key: 'last_login', label: 'Last Login', sortable: true },
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
              <button className={styles.iconBtn} title="Edit" onClick={() => handleEdit(row)}>✏️</button>
              <button className={styles.iconBtn} title="Disable" onClick={() => handleDisable(row.id)}>🚫</button>
              <button className={styles.iconBtn} title="Delete" onClick={() => handleDelete(row.id)}>🗑️</button>
            </>
          )}
          {row.status === 'disabled' && (
            <>
              <button className={styles.iconBtn} title="Edit" onClick={() => handleEdit(row)}>✏️</button>
              <button className={styles.iconBtn} title="Enable" onClick={() => handleEnable(row.id)}>✅</button>
              <button className={styles.iconBtn} title="Delete" onClick={() => handleDelete(row.id)}>🗑️</button>
            </>
          )}
          {row.status === 'deleted' && <span>View only</span>}
        </div>
      ),
    },
  ];

  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ').slice(1).join(' '),
      email: user.email,
      role_id: user.role,
      region_id: user.location,
    });
    setShowAddModal(true);
  };

  const handleDisable = async (userId) => {
    try {
      setError(null);
      await disableAdminUser(userId);
      const updated = await getAdminUsers();
      setUsers(updated.results || updated);
    } catch (error) {
      console.error('Failed to disable user:', error);
      setError('Failed to disable user. Please try again.');
    }
  };

  const handleEnable = async (userId) => {
    try {
      setError(null);
      await enableAdminUser(userId);
      const updated = await getAdminUsers();
      setUsers(updated.results || updated);
    } catch (error) {
      console.error('Failed to enable user:', error);
      setError('Failed to enable user. Please try again.');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setError(null);
        await deleteAdminUser(userId);
        const updated = await getAdminUsers();
        setUsers(updated.results || updated);
      } catch (error) {
        console.error('Failed to delete user:', error);
        setError('Failed to delete user. Please try again.');
      }
    }
  };

  const handleAddUser = async () => {
    try {
      setError(null);
      if (formData.id) {
        await updateAdminUser(formData.id, formData);
      } else {
        await createAdminUser(formData);
      }
      const updated = await getAdminUsers();
      setUsers(updated.results || updated);
      setShowAddModal(false);
      setFormData({ first_name: '', last_name: '', email: '', role_id: '', region_id: '', password: '' });
    } catch (error) {
      console.error('Failed to save user:', error);
      setError('Failed to save user. Please try again.');
    }
  };

  if (loading) {
    return <div className={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Management</h1>

      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

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
          title={formData.id ? 'Edit User' : 'Add User'}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUser}
        >
          <div className={styles.formGroup}>
            <label>First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className={styles.formInput}
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={styles.formInput}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div className={styles.modalButtons}>
            <button className={styles.primaryBtn} onClick={handleAddUser}>
              {formData.id ? 'Update' : 'Create'}
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
