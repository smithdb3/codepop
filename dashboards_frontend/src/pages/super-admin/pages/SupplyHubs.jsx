import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { REGIONS, HUBS } from '../mockData';
import styles from './SupplyHubs.module.css';

export function SupplyHubs() {
  const [selectedRegion, setSelectedRegion] = useState('chicago');

  const hubColumns = [
    { key: 'name', label: 'Hub Name', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} text={val === 'online' ? 'Online' : 'Degraded'} />,
    },
    { key: 'stores', label: 'Assigned Stores', sortable: true },
    { key: 'inventory', label: 'Inventory Level %', sortable: true, render: (val) => `${val}%` },
    { key: 'lastUpdated', label: 'Last Updated', sortable: true },
  ];

  const filteredHubs = HUBS.filter((hub) => hub.region === selectedRegion);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Supply Hubs</div>
        <h1 className={styles.title}>Supply Hubs</h1>
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

      <DataTable columns={hubColumns} data={filteredHubs} searchable={true} rowsPerPage={25} />
    </div>
  );
}
