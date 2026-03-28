import React, { useState } from 'react';
import { Modal } from '../../super-admin/components/Modal';
import { ADMIN_ROLES, ALL_PERMISSIONS } from '../mockData';
import styles from './RolesPermissions.module.css';

const PERMISSION_CATEGORIES = ['User Management', 'Roles & Permissions', 'System & Audit'];

export function RolesPermissions() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

  const handleEditRole = (role) => {
    setEditingRole(role);
    setSelectedPermissions(new Set(role.permissions));
    setShowEditModal(true);
  };

  const handleSaveRole = () => {
    setShowEditModal(false);
    setEditingRole(null);
  };

  const handleCreateRole = () => {
    setShowCreateModal(false);
    setNewRoleName('');
    setSelectedPermissions(new Set());
  };

  const togglePermission = (permId) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setSelectedPermissions(newSet);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Roles & Permissions</h1>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          + Custom Role
        </button>
      </div>

      <div className={styles.rolesGrid}>
        {ADMIN_ROLES.map((role) => (
          <div key={role.id} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <h3 className={styles.roleName}>{role.name}</h3>
              <span className={styles.permissionBadge}>{role.permissions.length}</span>
            </div>
            <div className={styles.roleBody}>
              <p className={styles.userCount}>{role.userCount} active users</p>
            </div>
            <div className={styles.roleFooter}>
              <button className={styles.secondaryBtn} onClick={() => handleEditRole(role)}>
                Edit
              </button>
              {!role.isBuiltIn && (
                <button className={styles.secondaryBtn}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showEditModal && editingRole && (
        <Modal
          title={`Edit ${editingRole.name}`}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveRole}
        >
          <div className={styles.permissionList}>
            {PERMISSION_CATEGORIES.map((category) => {
              const permsInCategory = ALL_PERMISSIONS.filter((p) => p.category === category);
              return (
                <div key={category} className={styles.permissionCategory}>
                  <h4 className={styles.categoryTitle}>{category}</h4>
                  <div className={styles.permissionToggles}>
                    {permsInCategory.map((perm) => (
                      <label key={perm.id} className={styles.permissionToggle}>
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.modalButtons}>
            <button className={styles.primaryBtn} onClick={handleSaveRole}>
              Save
            </button>
            <button className={styles.secondaryBtn} onClick={() => setShowEditModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showCreateModal && (
        <Modal
          title="Create Custom Role"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRole}
        >
          <div className={styles.formGroup}>
            <label>Role Name</label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className={styles.formInput}
              placeholder="Enter role name"
            />
          </div>

          <div className={styles.permissionList}>
            {PERMISSION_CATEGORIES.map((category) => {
              const permsInCategory = ALL_PERMISSIONS.filter((p) => p.category === category);
              return (
                <div key={category} className={styles.permissionCategory}>
                  <h4 className={styles.categoryTitle}>{category}</h4>
                  <div className={styles.permissionToggles}>
                    {permsInCategory.map((perm) => (
                      <label key={perm.id} className={styles.permissionToggle}>
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.modalButtons}>
            <button className={styles.primaryBtn} onClick={handleCreateRole}>
              Create
            </button>
            <button className={styles.secondaryBtn} onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
