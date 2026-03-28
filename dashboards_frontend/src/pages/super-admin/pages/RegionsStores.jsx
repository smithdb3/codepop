import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { REGIONS, STORES } from '../mockData';
import styles from './RegionsStores.module.css';

export function RegionsStores() {
  const [selectedRegion, setSelectedRegion] = useState('chicago');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const storeColumns = [
    { key: 'name', label: 'Store Name', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} text={val === 'online' ? 'Online' : 'Offline'} />,
    },
    { key: 'orders', label: 'Active Orders', sortable: true },
    {
      key: 'inventory',
      label: 'Inventory %',
      sortable: true,
      render: (val) => <div className={styles.inventoryBar}>{val}%</div>,
    },
    { key: 'revenue', label: 'Revenue', sortable: true, render: (val) => `$${val}` },
    { key: 'lastCheck', label: 'Last Check', sortable: true },
  ];

  const filteredStores = STORES.filter((store) => store.region === selectedRegion);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Regions & Stores</div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Regions & Stores</h1>
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            + Create Store
          </button>
        </div>
      </div>

      <div className={styles.regionSelector}>
        {REGIONS.map((region) => (
          <button
            key={region.id}
            className={`${styles.regionBtn} ${selectedRegion === region.id ? styles.active : ''}`}
            onClick={() => setSelectedRegion(region.id)}
          >
            {region.name}
          </button>
        ))}
      </div>

      <DataTable columns={storeColumns} data={filteredStores} searchable={true} rowsPerPage={25} />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Store"
      >
        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label>Store Name</label>
            <input type="text" placeholder="e.g., Downtown Location" />
          </div>
          <div className={styles.formGroup}>
            <label>Address</label>
            <input type="text" placeholder="Street address" />
          </div>
          <div className={styles.formGroup}>
            <label>Region</label>
            <select defaultValue={selectedRegion}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Operating Hours</label>
            <input type="text" placeholder="e.g., 7am - 10pm" />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="button" className={styles.submitBtn}>
              Create Store
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
