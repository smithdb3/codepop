import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { USERS, ROLES, ALL_PERMISSIONS } from '../mockData';
import styles from './UserManagement.module.css';

export function UserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const userColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (val) => (
        <select defaultValue={val} className={styles.roleSelect}>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="repair_staff">Repair Staff</option>
          <option value="logistics_manager">Logistics Manager</option>
        </select>
      ),
    },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'lastLogin', label: 'Last Login', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} text={val === 'active' ? 'Active' : 'Inactive'} />,
    },
  ];

  return (
    <div className={styles.page}>
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
        <DataTable columns={userColumns} data={USERS} searchable={true} rowsPerPage={25} />
      )}

      {activeTab === 'roles' && (
        <div className={styles.rolesList}>
          {ROLES.map((role) => (
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
            <label>Name</label>
            <input type="text" placeholder="Full name" />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" placeholder="email@codepop.com" />
          </div>
          <div className={styles.formGroup}>
            <label>Role</label>
            <select>
              <option>Super Admin</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Repair Staff</option>
              <option>Logistics Manager</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Assigned Region</label>
            <select>
              <option>All Regions</option>
              <option>Chicago</option>
              <option>New Jersey</option>
              <option>Logan</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateUserModal(false)}>
              Cancel
            </button>
            <button type="button" className={styles.submitBtn}>
              Create User
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showRoleModal && selectedRole}
        onClose={() => setShowRoleModal(false)}
        title={`Edit Role: ${selectedRole?.name || ''}`}
      >
        <div className={styles.permissionsList}>
          {ALL_PERMISSIONS.map((perm) => (
            <label key={perm.id} className={styles.permissionItem}>
              <input
                type="checkbox"
                defaultChecked={selectedRole?.permissions.includes(perm.id)}
              />
              <span>{perm.label}</span>
            </label>
          ))}
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.cancelBtn} onClick={() => setShowRoleModal(false)}>
            Cancel
          </button>
          <button type="button" className={styles.submitBtn}>
            Save Changes
          </button>
        </div>
      </Modal>
    </div>
  );
}
