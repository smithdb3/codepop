import React, { useState, useMemo, useEffect } from 'react';
import { getLogisticsSupplyRequests, updateSupplyRequestStatus } from '../../../api/supplyRequests';
import { getLogisticsStores } from '../../../api/stores';
import { getLogisticsHubStatus } from '../../../api/hubs';
import { getLogisticsHubInventory } from '../../../api/inventory';
import styles from './SupplyRequests.module.css';

export function SupplyRequests({ onNavigate }) {
  // API state
  const [stores, setStores] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // View state
  const [showNewRequestDrawer, setShowNewRequestDrawer] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeliveryType, setFilterDeliveryType] = useState('all');

  // Requests state (from API)
  const [requests, setRequests] = useState([]);

  // Form state
  const [toStoreId, setToStoreId] = useState('');
  const [ingredients, setIngredients] = useState([
    { name: '', qty: '', unit: 'cases', aiSuggested: 0, notes: '' },
  ]);
  const [deliveryType, setDeliveryType] = useState('hub');
  const [sourceStore, setSourceStore] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Fetch supply requests
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await getLogisticsSupplyRequests();
      setRequests(data || []);
    } catch (error) {
      console.error('Failed to fetch supply requests:', error);
      setToast({ visible: true, message: 'Failed to load supply requests' });
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch stores, hubs, and requests on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingStores(true);
      try {
        const storesData = await getLogisticsStores();
        const mappedStores = storesData.map((store) => ({
          id: store.id,
          name: store.store_name,
          address: store.location,
          region: store.region_name,
          daysRemaining: store.days_remaining,
        }));
        setStores(mappedStores);

        const hubsData = await getLogisticsHubStatus();
        setHubs(hubsData);

        if (hubsData.length > 0) {
          const items = await getLogisticsHubInventory(hubsData[0].id);
          setInventoryItems(items);
        }

        // Fetch supply requests
        await fetchRequests();
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingStores(false);
      }
    };
    fetchData();
  }, []);

  // Toast auto-hide effect
  React.useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ visible: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Get unique regions from stores
  const storesByRegion = useMemo(() => {
    const grouped = {};
    stores.forEach((store) => {
      if (!grouped[store.region]) {
        grouped[store.region] = [];
      }
      grouped[store.region].push(store);
    });
    return grouped;
  }, [stores]);

  // Separate pending and completed requests
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status !== 'fulfilled' && r.status !== 'denied'),
    [requests]
  );

  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === 'fulfilled' || r.status === 'denied'),
    [requests]
  );

  // Filter pending requests
  const filteredPendingRequests = useMemo(() => {
    return pendingRequests.filter((request) => {
      const matchesSearch =
        search === '' ||
        request.store_name.toLowerCase().includes(search.toLowerCase()) ||
        request.id.toString().includes(search);
      const matchesStatus =
        filterStatus === 'all' || request.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [pendingRequests, search, filterStatus]);

  // Filter completed requests
  const filteredCompletedRequests = useMemo(() => {
    return completedRequests.filter((request) => {
      const matchesSearch =
        search === '' ||
        request.store_name.toLowerCase().includes(search.toLowerCase()) ||
        request.id.toString().includes(search);
      return matchesSearch;
    });
  }, [completedRequests, search]);

  // Check if filters are active
  const hasActiveFilters =
    search !== '' || filterStatus !== 'all' || filterDeliveryType !== 'all';

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterDeliveryType('all');
  };

  // Toggle expanded row
  const toggleExpandedRow = (requestId) => {
    setExpandedRequestId(
      expandedRequestId === requestId ? null : requestId
    );
  };

  // Handle action buttons (approve/deny/fulfill)
  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await updateSupplyRequestStatus(requestId, newStatus);
      // Refresh requests from API
      await fetchRequests();
      setToast({
        visible: true,
        message: `Request ${requestId} updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update request:', error);
      setToast({
        visible: true,
        message: 'Failed to update request',
      });
    }
  };

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return {
          bg: '#F3F4F6',
          color: '#6B7280',
          label: 'Pending',
        };
      case 'approved':
        return {
          bg: '#DBEAFE',
          color: '#1D4ED8',
          label: 'Approved',
        };
      case 'fulfilled':
        return {
          bg: '#DCFCE7',
          color: '#15803D',
          label: 'Fulfilled',
        };
      case 'denied':
        return {
          bg: '#FEE2E2',
          color: '#DC2626',
          label: 'Denied',
        };
      default:
        return {
          bg: '#F3F4F6',
          color: '#6B7280',
          label: 'Unknown',
        };
    }
  };

  // Get delivery type label
  const getDeliveryTypeLabel = (type) => {
    return type === 'hub' ? 'Supply Hub' : 'Nearby Store';
  };

  // Reset form
  const resetForm = () => {
    setToStoreId('');
    setIngredients([
      { name: '', qty: '', unit: 'cases', aiSuggested: 0, notes: '' },
    ]);
    setDeliveryType('hub');
    setSourceStore('');
    setSpecialInstructions('');
  };

  // Handle submit new request
  const handleSubmitRequest = () => {
    if (!toStoreId) {
      alert('Please select a destination store');
      return;
    }

    const hasValidIngredient = ingredients.some(
      (ing) => ing.name && ing.qty
    );
    if (!hasValidIngredient) {
      alert('Please add at least one ingredient with quantity');
      return;
    }

    if (deliveryType === 'nearby' && !sourceStore) {
      alert('Please select a source store');
      return;
    }

    // Create new request - this would be handled by manager, not logistics
    setToast({
      visible: true,
      message: 'Note: Supply requests are created by store managers, not logistics staff.',
    });
  };

  // Update ingredient
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  // Add ingredient
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: '', qty: '', unit: 'cases', aiSuggested: 0, notes: '' },
    ]);
  };

  // Remove ingredient
  const handleRemoveIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  // Fill AI suggestion
  const handleFillAISuggestion = (index) => {
    const newIngredients = [...ingredients];
    newIngredients[index].qty = newIngredients[index].aiSuggested.toString();
    setIngredients(newIngredients);
  };

  // Pending Requests Table
  const PendingRequestsTable = () => (
    <div className={styles.tableSection}>
      <div className={styles.tableWrapper}>
        <table className={styles.requestsTable}>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Store</th>
              <th>Items Summary</th>
              <th>Submitted Date</th>
              <th>Status</th>
              <th>Urgency</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPendingRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.emptyRow}>
                  No pending requests
                </td>
              </tr>
            ) : (
              filteredPendingRequests.map((request) => {
                const isExpanded = expandedRequestId === request.id;
                const badge = getStatusBadgeStyle(request.status);
                const itemsSummary = request.items.map(i => `${i.name} (${i.qty})`).join(', ');

                return (
                  <React.Fragment key={request.id}>
                    <tr
                      onClick={() => toggleExpandedRow(request.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>#{request.id}</td>
                      <td>{request.store_name || '-'}</td>
                      <td>{itemsSummary}</td>
                      <td>{new Date(request.created_at).toLocaleDateString()}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>{request.urgency || '-'}</td>
                      <td>
                        {request.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className={styles.approveBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(request.id, 'approved');
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.denyBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(request.id, 'denied');
                              }}
                            >
                              Deny
                            </button>
                          </div>
                        )}
                        {request.status === 'approved' && (
                          <button
                            className={styles.fulfillBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(request.id, 'fulfilled');
                            }}
                          >
                            Fulfill
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="7">
                          <div className={styles.expandedContent}>
                            <div>
                              <h4>Items Requested:</h4>
                              <ul>
                                {request.items.map((item, idx) => (
                                  <li key={idx}>
                                    {item.name} - {item.qty} {item.unit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {request.notes && (
                              <div>
                                <h4>Notes:</h4>
                                <p>{request.notes}</p>
                              </div>
                            )}
                            <div>
                              <h4>Requested By:</h4>
                              <p>{request.created_by_name || 'Unknown'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Completed Requests Table
  const CompletedRequestsTable = () => (
    <div className={styles.tableSection}>
      <div
        className={styles.tableHeader}
        onClick={() => setCompletedExpanded(!completedExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <h3>
          Completed Requests {completedExpanded ? '▼' : '▶'}
        </h3>
        <span className={styles.count}>({filteredCompletedRequests.length})</span>
      </div>

      {completedExpanded && (
        <div className={styles.tableWrapper}>
          <table className={styles.requestsTable}>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Store</th>
                <th>Items Summary</th>
                <th>Submitted</th>
                <th>Completed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompletedRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyRow}>
                    No completed requests
                  </td>
                </tr>
              ) : (
                filteredCompletedRequests.map((request) => {
                  const badge = getStatusBadgeStyle(request.status);
                  const itemsSummary = request.items.map(i => `${i.name} (${i.qty})`).join(', ');
                  return (
                    <tr key={request.id}>
                      <td>#{request.id}</td>
                      <td>{request.store_name || '-'}</td>
                      <td>{itemsSummary}</td>
                      <td>{new Date(request.created_at).toLocaleDateString()}</td>
                      <td>{request.fulfilled_at ? new Date(request.fulfilled_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Supply Requests</h1>

      {loadingRequests && <div>Loading requests...</div>}
      {loadingStores && <div>Loading stores...</div>}

      {!loadingRequests && !loadingStores && (
        <>
          {/* Filters */}
          <div className={styles.filtersBar}>
            <input
              type="text"
              placeholder="Search by store name or request ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="denied">Denied</option>
            </select>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className={styles.clearFiltersBtn}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Pending Requests */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Pending Requests ({filteredPendingRequests.length})</h2>
            <PendingRequestsTable />
          </div>

          {/* Completed Requests */}
          <div className={styles.section}>
            <CompletedRequestsTable />
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div className={styles.toast}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
