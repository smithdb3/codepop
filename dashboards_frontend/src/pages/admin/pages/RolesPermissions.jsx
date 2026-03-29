import React, { useState, useEffect } from 'react';
import { Modal } from '../../super-admin/components/Modal';
import { getRoles, getPermissions, createRole, updateRole, deleteRole } from '../../../api/roles';
import styles from './RolesPermissions.module.css';

export function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

  // Fetch roles and permissions on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [rolesData, permsData] = await Promise.all([
          getRoles(),
          getPermissions(),
        ]);
        setRoles(rolesData.results || rolesData);
        setPermissions(permsData.results || permsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load data. Check that you are logged in as an admin.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const PERMISSION_CATEGORIES = ['user_management', 'roles_permissions', 'system_audit'];
  const CATEGORY_LABELS = {
    user_management: 'User Management',
    roles_permissions: 'Roles & Permissions',
    system_audit: 'System & Audit',
  };

  const handleEditRole = (role) => {
    if (role.is_builtin) {
      alert('Cannot edit built-in roles');
      return;
    }
    setEditingRole(role);
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    setShowEditModal(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      setError(null);
      const permissionIds = Array.from(selectedPermissions);
      await updateRole(editingRole.id, {
        name: editingRole.name,
        description: editingRole.description,
        permission_ids: permissionIds,
      });
      const updated = await getRoles();
      setRoles(updated.results || updated);
      setShowEditModal(false);
      setEditingRole(null);
    } catch (error) {
      console.error('Failed to save role:', error);
      setError('Failed to save role. Please try again.');
    }
  };

  const handleCreateRole = async () => {
    try {
      setError(null);
      const permissionIds = Array.from(selectedPermissions);
      await createRole({
        name: newRoleName,
        description: newRoleDesc,
        permission_ids: permissionIds,
      });
      const updated = await getRoles();
      setRoles(updated.results || updated);
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPermissions(new Set());
    } catch (error) {
      console.error('Failed to create role:', error);
      setError('Failed to create role. Please try again.');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      setError(null);
      await deleteRole(role.id);
      const updated = await getRoles();
      setRoles(updated.results || updated);
    } catch (error) {
      console.error('Failed to delete role:', error);
      setError('Failed to delete role. Please try again.');
    }
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

  if (loading) {
    return <div className={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}
      <div className={styles.header}>
        <h1 className={styles.title}>Roles & Permissions</h1>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          + Custom Role
        </button>
      </div>

      <div className={styles.rolesGrid}>
        {roles.map((role) => (
          <div key={role.id} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <h3 className={styles.roleName}>{role.name}</h3>
              <span className={styles.permissionBadge}>{role.permissions.length}</span>
            </div>
            <div className={styles.roleBody}>
              <p className={styles.userCount}>{role.user_count} active users</p>
            </div>
            <div className={styles.roleFooter}>
              <button className={styles.secondaryBtn} onClick={() => handleEditRole(role)}>
                Edit
              </button>
              {!role.is_builtin && (
                <button className={styles.secondaryBtn} onClick={() => handleDeleteRole(role)}>
                  Delete
                </button>
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
              const permsInCategory = permissions.filter((p) => p.category === category);
              return (
                <div key={category} className={styles.permissionCategory}>
                  <h4 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h4>
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

          <div className={styles.formGroup}>
            <label>Description</label>
            <input
              type="text"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className={styles.formInput}
              placeholder="Enter role description (optional)"
            />
          </div>

          <div className={styles.permissionList}>
            {PERMISSION_CATEGORIES.map((category) => {
              const permsInCategory = permissions.filter((p) => p.category === category);
              return (
                <div key={category} className={styles.permissionCategory}>
                  <h4 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h4>
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
