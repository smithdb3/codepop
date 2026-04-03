import React, { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { getRegions } from '../../../api/regions';
import { getAdminHubs } from '../../../api/hubs';
import styles from './SupplyHubs.module.css';

export function SupplyHubs() {
  const [regions, setRegions] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const data = await getRegions();
        setRegions(data);
        if (data.length > 0) {
          setSelectedRegion(data[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch regions:', error);
      }
    };
    fetchRegions();
  }, []);

  // Fetch hubs when selected region changes
  useEffect(() => {
    if (!selectedRegion) return;

    const fetchHubs = async () => {
      setLoading(true);
      try {
        const data = await getAdminHubs({ region: selectedRegion });
        // Map API fields to table fields
        const mappedHubs = data.map((hub) => ({
          ...hub,
          region: hub.region_name,
          inventory: hub.inventory_pct,
          lastUpdated: new Date().toLocaleString(), // Placeholder
        }));
        setHubs(mappedHubs);
      } catch (error) {
        console.error('Failed to fetch hubs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHubs();
  }, [selectedRegion]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} Supply Hubs</div>
        <h1 className={styles.title}>Supply Hubs</h1>
      </div>

      <div className={styles.regionSelector}>
        {regions.map((region) => (
          <button
            key={region.id}
            className={`${styles.regionBtn} ${selectedRegion === region.name ? styles.active : ''}`}
            onClick={() => setSelectedRegion(region.name)}
          >
            {region.display_name}
          </button>
        ))}
      </div>

      {loading ? <p>Loading hubs...</p> : <DataTable columns={hubColumns} data={hubs} searchable={true} rowsPerPage={25} />}
    </div>
  );
}
