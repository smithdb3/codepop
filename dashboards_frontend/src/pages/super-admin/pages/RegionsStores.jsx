import React, { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { getRegions } from '../../../api/regions';
import { getAdminStores as getStoresApi, createStore as createStoreApi } from '../../../api/stores';
import styles from './RegionsStores.module.css';

export function RegionsStores() {
  const [regions, setRegions] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeName: '',
    address: '',
    region: '',
    operatingHours: '',
    apiEndpoint: '',
  });

  const storeColumns = [
    { key: 'name', label: 'Store Name', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val === 'active' ? 'online' : 'offline'} text={val === 'active' ? 'Online' : 'Offline'} />,
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

  // Fetch stores when selected region changes
  useEffect(() => {
    if (!selectedRegion) return;

    const fetchStores = async () => {
      setLoading(true);
      try {
        const data = await getStoresApi({ region: selectedRegion });
        // Map API fields to table fields
        const mappedStores = data.map((store) => ({
          ...store,
          name: store.store_name,
          region: store.region_name,
          status: store.status === 'active' ? 'online' : 'offline',
          orders: 0, // Stub: Part 11
          inventory: 0, // Stub: Part 4
          revenue: '—', // Stub: Part 11
          lastCheck: store.last_heartbeat ? new Date(store.last_heartbeat).toLocaleString() : '—',
        }));
        setStores(mappedStores);
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, [selectedRegion]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateStore = async () => {
    if (!formData.storeName || !formData.address || !formData.region || !formData.apiEndpoint) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await createStoreApi({
        store_name: formData.storeName,
        location: formData.address,
        region: parseInt(formData.region),
        api_endpoint: formData.apiEndpoint,
      });

      // Refresh stores list
      const data = await getStoresApi({ region: selectedRegion });
      const mappedStores = data.map((store) => ({
        ...store,
        name: store.store_name,
        region: store.region_name,
        status: store.status === 'active' ? 'online' : 'offline',
        orders: 0,
        inventory: 0,
        revenue: '—',
        lastCheck: store.last_heartbeat ? new Date(store.last_heartbeat).toLocaleString() : '—',
      }));
      setStores(mappedStores);

      // Close modal and reset form
      setShowCreateModal(false);
      setFormData({
        storeName: '',
        address: '',
        region: selectedRegion,
        operatingHours: '',
        apiEndpoint: '',
      });
    } catch (error) {
      console.error('Failed to create store:', error);
      alert('Failed to create store');
    }
  };

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

      {loading ? <p>Loading stores...</p> : <DataTable columns={storeColumns} data={stores} searchable={true} rowsPerPage={25} />}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Store"
      >
        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label>Store Name</label>
            <input
              type="text"
              name="storeName"
              placeholder="e.g., Downtown Location"
              value={formData.storeName}
              onChange={handleFormChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              placeholder="Street address"
              value={formData.address}
              onChange={handleFormChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Region</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleFormChange}
            >
              <option value="">Select a region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>API Endpoint</label>
            <input
              type="url"
              name="apiEndpoint"
              placeholder="e.g., http://store.example.com:8000"
              value={formData.apiEndpoint}
              onChange={handleFormChange}
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleCreateStore}
            >
              Create Store
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
