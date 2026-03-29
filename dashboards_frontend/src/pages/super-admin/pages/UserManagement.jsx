import React, { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { getAdminUsers, createAdminUser, updateAdminUser } from '../../../api/users';
import { getRoles } from '../../../api/roles';
import styles from './UserManagement.module.css';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ first_name: '', last_name: '', email: '', role_id: '', region_id: '', password: '' });

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

  const userColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (val, row) => (
        <select
          value={val ?? ''}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
          className={styles.roleSelect}
        >
          <option value="">Unassigned</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      ),
    },
    { key: 'location', label: 'Region', sortable: true },
    { key: 'last_login', label: 'Last Login', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <StatusBadge status={val} text={val === 'active' ? 'Active' : 'Inactive'} />
      ),
    },
  ];

  const handleRoleChange = async (userId, roleId) => {
    try {
      setError(null);
      const user = users.find(u => u.id === userId);
      await updateAdminUser(userId, { ...user, role_id: roleId });
      const updated = await getAdminUsers();
      setUsers(updated.results || updated);
    } catch (error) {
      console.error('Failed to update user role:', error);
      setError('Failed to update user role. Please try again.');
    }
  };

  const handleCreateUser = async () => {
    try {
      setError(null);
      await createAdminUser(newUserForm);
      const updated = await getAdminUsers();
      setUsers(updated.results || updated);
      setShowCreateUserModal(false);
      setNewUserForm({ first_name: '', last_name: '', email: '', role_id: '', region_id: '', password: '' });
    } catch (error) {
      console.error('Failed to create user:', error);
      setError('Failed to create user. Please try again.');
    }
  };

  if (loading) {
    return <div className={styles.page}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} User Management</div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>User Management</h1>
          {activeTab === 'users' && (
            <button
              className={styles.createBtn}
              onClick={() => setShowCreateUserModal(true)}
            >
              + Create User
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'roles' ? styles.active : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Manage Roles
        </button>
      </div>

      {activeTab === 'users' && (
        <DataTable columns={userColumns} data={users} searchable={true} rowsPerPage={25} />
      )}

      {activeTab === 'roles' && (
        <div className={styles.rolesList}>
          {roles.map((role) => (
            <div
              key={role.id}
              className={styles.roleCard}
              onClick={() => {
                setSelectedRole(role);
                setShowRoleModal(true);
              }}
            >
              <div className={styles.roleName}>{role.name}</div>
              <div className={styles.rolePermCount}>{role.permissions.length} permissions</div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create New User"
      >
        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label>First Name</label>
            <input
              type="text"
              placeholder="First name"
              value={newUserForm.first_name}
              onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Last name"
              value={newUserForm.last_name}
              onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              placeholder="email@codepop.com"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              value={newUserForm.role_id}
              onChange={(e) => setNewUserForm({ ...newUserForm, role_id: e.target.value })}
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
              placeholder="Password"
              value={newUserForm.password || ''}
              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateUserModal(false)}>
              Cancel
            </button>
            <button type="button" className={styles.submitBtn} onClick={handleCreateUser}>
              Create User
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showRoleModal && selectedRole}
        onClose={() => setShowRoleModal(false)}
        title={`View Role: ${selectedRole?.name || ''}`}
      >
        <div className={styles.permissionsList}>
          {selectedRole?.permissions.map((perm) => (
            <label key={perm.id} className={styles.permissionItem}>
              <input type="checkbox" defaultChecked disabled />
              <span>{perm.label}</span>
            </label>
          ))}
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.cancelBtn} onClick={() => setShowRoleModal(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
