import React, { useState, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { Modal } from '../../super-admin/components/Modal';
import { ADMIN_MANAGERS, ADMIN_USERS } from '../mockData';
import styles from './ManagerAccounts.module.css';

export function ManagerAccounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRegions, setSelectedRegions] = useState([]);

  const filteredData = useMemo(() => {
    let result = ADMIN_MANAGERS;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (manager) =>
          manager.name.toLowerCase().includes(term) ||
          manager.email.toLowerCase().includes(term)
      );
    }

    if (regionFilter !== 'all') {
      result = result.filter((manager) => manager.regions.includes(regionFilter));
    }

    return result;
  }, [searchTerm, regionFilter]);

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'regions', label: 'Region(s)/Store(s)', sortable: true },
    { key: 'reportsTo', label: 'Reports To', sortable: true },
    { key: 'activeUsersUnder', label: 'Active Users Under', sortable: true },
    { key: 'lastLogin', label: 'Last Login', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: () => (
        <button className={styles.moreBtn} title="More actions">
          ⋯
        </button>
      ),
    },
  ];

  const handlePromoteUser = () => {
    setShowPromoteModal(false);
    setSelectedUser('');
    setSelectedRegions([]);
  };

  const activeUsers = ADMIN_USERS.filter((u) => u.status === 'active');

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manager Accounts</h1>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Regions</option>
          <option value="Chicago">Chicago</option>
          <option value="Dallas">Dallas</option>
          <option value="New Jersey">New Jersey</option>
          <option value="Atlanta">Atlanta</option>
          <option value="Phoenix">Phoenix</option>
          <option value="Seattle">Seattle</option>
          <option value="Logan">Logan</option>
        </select>

        <div className={styles.spacer} />

        <button className={styles.primaryBtn} onClick={() => setShowPromoteModal(true)}>
          + Promote to Manager
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable columns={columns} data={filteredData} searchable={false} rowsPerPage={25} />
      </div>

      {showPromoteModal && (
        <Modal
          title="Promote to Manager"
          onClose={() => setShowPromoteModal(false)}
          onSubmit={handlePromoteUser}
        >
          <div className={styles.formGroup}>
            <label>Select an active user to promote</label>
            <input
              type="text"
              placeholder="Search users..."
              className={styles.formInput}
            />
            <div className={styles.userList}>
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className={`${styles.userListItem} ${selectedUser === user.id ? styles.selected : ''}`}
                  onClick={() => setSelectedUser(user.id)}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>
                  <div className={styles.userRole}>{user.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Region/Store Assignment (Multi-select)</label>
            <div className={styles.checkboxGroup}>
              {['Chicago', 'Dallas', 'New Jersey', 'Atlanta', 'Phoenix', 'Seattle', 'Logan'].map(
                (region) => (
                  <label key={region} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(region)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRegions([...selectedRegions, region]);
                        } else {
                          setSelectedRegions(selectedRegions.filter((r) => r !== region));
                        }
                      }}
                    />
                    {region}
                  </label>
                )
              )}
            </div>
          </div>

          <div className={styles.modalButtons}>
            <button className={styles.primaryBtn} onClick={handlePromoteUser}>
              Promote
            </button>
            <button className={styles.secondaryBtn} onClick={() => setShowPromoteModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
