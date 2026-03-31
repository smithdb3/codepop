import React, { useState, useMemo, useEffect } from 'react';
import { SUPPLY_REQUESTS } from '../mockData';
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
  // View state
  const [showNewRequestDrawer, setShowNewRequestDrawer] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeliveryType, setFilterDeliveryType] = useState('all');

  // Requests state (local copy for mutations)
  const [requests, setRequests] = useState(SUPPLY_REQUESTS);

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

  // Fetch stores and hubs on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingStores(true);
      try {
        const storesData = await getLogisticsStores();
        // Map API fields to component fields
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

        // Fetch inventory items from the first hub
        if (hubsData.length > 0) {
          const items = await getLogisticsHubInventory(hubsData[0].id);
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Failed to fetch stores/hubs/inventory:', error);
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
    () => requests.filter((r) => r.status !== 'delivered'),
    [requests]
  );

  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === 'delivered'),
    [requests]
  );

  // Filter pending requests
  const filteredPendingRequests = useMemo(() => {
    return pendingRequests.filter((request) => {
      const matchesSearch =
        search === '' ||
        request.store.toLowerCase().includes(search.toLowerCase()) ||
        request.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === 'all' || request.status === filterStatus;
      const matchesDeliveryType =
        filterDeliveryType === 'all' || request.deliveryType === filterDeliveryType;
      return matchesSearch && matchesStatus && matchesDeliveryType;
    });
  }, [pendingRequests, search, filterStatus, filterDeliveryType]);

  // Filter completed requests
  const filteredCompletedRequests = useMemo(() => {
    return completedRequests.filter((request) => {
      const matchesSearch =
        search === '' ||
        request.store.toLowerCase().includes(search.toLowerCase()) ||
        request.id.toLowerCase().includes(search.toLowerCase());
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

  // Handle cancel request
  const handleCancelRequest = (requestId) => {
    setRequests(
      requests.filter((r) => r.id !== requestId)
    );
    setToast({
      visible: true,
      message: `Request ${requestId} cancelled.`,
    });
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
      case 'in_transit':
        return {
          bg: '#CFFAFE',
          color: '#0891B2',
          label: 'In Transit',
        };
      case 'delivered':
        return {
          bg: '#DCFCE7',
          color: '#15803D',
          label: 'Delivered',
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
    // Validate required fields
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

    // Get highest request ID number
    const highestId = Math.max(
      ...requests.map((r) => {
        const num = parseInt(r.id.split('-')[2], 10);
        return isNaN(num) ? 0 : num;
      }),
      0
    );

    // Create new request
    const selectedStore = stores.find((s) => s.id === toStoreId);
    const ingredientBreakdown = ingredients
      .filter((ing) => ing.name && ing.qty)
      .map((ing) => ({
        name: ing.name,
        qty: parseInt(ing.qty, 10),
        unit: ing.unit,
        aiSuggested: ing.aiSuggested,
      }));

    const ingredientsSummary = ingredientBreakdown
      .map((ing) => ing.name)
      .slice(0, 2)
      .join(', ') + (ingredientBreakdown.length > 2 ? '...' : '');

    const newRequest = {
      id: `REQ-2026-${String(highestId + 1).padStart(3, '0')}`,
      store: selectedStore.name,
      ingredientsSummary,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      deliveryType,
      sourceStore: deliveryType === 'nearby' ? sourceStore : null,
      eta: null,
      completedDate: null,
      ingredientBreakdown,
      notes: specialInstructions,
      approvalTimeline: [
        {
          date: new Date().toISOString().split('T')[0],
          status: 'submitted',
          comment: 'Request received',
        },
      ],
    };

    // Add to requests
    setRequests([newRequest, ...requests]);
    setShowNewRequestDrawer(false);
    resetForm();
    setToast({
      visible: true,
      message: `Request submitted successfully — ID: ${newRequest.id}`,
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
              <th>Ingredients Summary</th>
              <th>Submitted Date</th>
              <th>Status</th>
              <th>Delivery Type</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPendingRequests.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyRow}>
                  No pending requests
                </td>
              </tr>
            ) : (
              filteredPendingRequests.map((request) => {
                const isExpanded = expandedRequestId === request.id;
                const badge = getStatusBadgeStyle(request.status);

                return (
                  <React.Fragment key={request.id}>
                    <tr
                      className={isExpanded ? styles.expandedRowTrigger : ''}
                      onClick={() => toggleExpandedRow(request.id)}
                    >
                      <td className={styles.requestIdCell}>
                        <button
                          className={styles.requestIdLink}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandedRow(request.id);
                          }}
                        >
                          {request.id}
                        </button>
                      </td>
                      <td>{request.store}</td>
                      <td>{request.ingredientsSummary}</td>
                      <td className={styles.dateCell}>
                        {new Date(request.submittedDate).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>{getDeliveryTypeLabel(request.deliveryType)}</td>
                      <td className={styles.dateCell}>
                        {request.eta
                          ? new Date(request.eta).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                              }
                            )
                          : '—'}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.viewButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandedRow(request.id);
                          }}
                          title="View details"
                        >
                          👁
                        </button>
                        {request.status === 'pending' && (
                          <button
                            className={styles.cancelButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRequest(request.id);
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        {request.status !== 'pending' && (
                          <span className={styles.cancelButtonDisabled}>
                            Cancel
                          </span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="8">
                          <div className={styles.expandedContent}>
                            {/* Detailed Ingredients Breakdown */}
                            <div className={styles.expandedSection}>
                              <h4 className={styles.expandedSectionTitle}>
                                Ingredients Breakdown
                              </h4>
                              <table className={styles.ingredientBreakdownTable}>
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {request.ingredientBreakdown.map(
                                    (ingredient, idx) => (
                                      <tr key={idx}>
                                        <td>{ingredient.name}</td>
                                        <td>{ingredient.qty}</td>
                                        <td>{ingredient.unit}</td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Store Info */}
                            <div className={styles.expandedSection}>
                              <h4 className={styles.expandedSectionTitle}>
                                Store Information
                              </h4>
                              <div className={styles.storeInfo}>
                                <div>
                                  <strong>Store:</strong>{' '}
                                  {stores.find((s) => s.name === request.store)
                                    ?.name || request.store}
                                </div>
                                <div>
                                  <strong>Address:</strong>{' '}
                                  {stores.find((s) => s.name === request.store)
                                    ?.address || 'N/A'}
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            {request.notes && (
                              <div className={styles.expandedSection}>
                                <h4 className={styles.expandedSectionTitle}>
                                  Notes
                                </h4>
                                <p className={styles.notes}>
                                  {request.notes}
                                </p>
                              </div>
                            )}

                            {/* Approval Timeline */}
                            <div className={styles.expandedSection}>
                              <h4 className={styles.expandedSectionTitle}>
                                Approval Timeline
                              </h4>
                              <div className={styles.timeline}>
                                {request.approvalTimeline.map(
                                  (event, idx) => {
                                    const eventBadge = getStatusBadgeStyle(
                                      event.status
                                    );
                                    return (
                                      <div
                                        key={idx}
                                        className={styles.timelineEvent}
                                      >
                                        <span
                                          className={
                                            styles.timelineEventBadge
                                          }
                                          style={{
                                            backgroundColor: eventBadge.bg,
                                            color: eventBadge.color,
                                          }}
                                        >
                                          {eventBadge.label}
                                        </span>
                                        <span className={styles.timelineDate}>
                                          {new Date(
                                            event.date
                                          ).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                        <span className={styles.timelineComment}>
                                          {event.comment}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
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
    <div className={styles.completedSection}>
      <div
        className={styles.collapsibleHeader}
        onClick={() => setCompletedExpanded(!completedExpanded)}
      >
        <h3 className={styles.completedTitle}>Completed Requests</h3>
        <button className={styles.toggleButton}>
          {completedExpanded ? '▼' : '▲'}
        </button>
      </div>

      {completedExpanded && (
        <div className={styles.tableWrapper}>
          <table className={styles.requestsTable}>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Store</th>
                <th>Ingredients</th>
                <th>Date Completed</th>
                <th>Delivery Type</th>
                <th>Source Location</th>
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
                filteredCompletedRequests.map((request) => (
                  <tr key={request.id}>
                    <td className={styles.requestIdCell}>
                      <span className={styles.requestIdText}>
                        {request.id}
                      </span>
                    </td>
                    <td>{request.store}</td>
                    <td>{request.ingredientsSummary}</td>
                    <td className={styles.dateCell}>
                      {request.completedDate
                        ? new Date(request.completedDate).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )
                        : '—'}
                    </td>
                    <td>{getDeliveryTypeLabel(request.deliveryType)}</td>
                    <td>
                      {request.sourceStore
                        ? STORES.find((s) => s.id === request.sourceStore)
                            ?.name || request.sourceStore
                        : 'Chicago Hub'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Supply Requests</h1>
        <button
          className={styles.newRequestButton}
          onClick={() => setShowNewRequestDrawer(true)}
        >
          New Request
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by store or request ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />

        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
        </select>

        <select
          className={styles.filterSelect}
          value={filterDeliveryType}
          onChange={(e) => setFilterDeliveryType(e.target.value)}
        >
          <option value="all">All Delivery Types</option>
          <option value="hub">Supply Hub</option>
          <option value="nearby">Nearby Store</option>
        </select>

        {hasActiveFilters && (
          <button
            className={styles.clearFiltersButton}
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Pending Requests Section */}
      <div className={styles.pendingSection}>
        <h2 className={styles.sectionTitle}>
          Pending Requests ({filteredPendingRequests.length})
        </h2>
        <PendingRequestsTable />
      </div>

      {/* Completed Requests Section */}
      <CompletedRequestsTable />

      {/* New Supply Request Drawer */}
      {showNewRequestDrawer && (
        <>
          <div
            className={styles.drawerOverlay}
            onClick={() => setShowNewRequestDrawer(false)}
          />
          <div className={styles.requestDrawer}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>New Supply Request</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowNewRequestDrawer(false)}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className={styles.drawerBody}>
              {/* Hub (read-only) */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Hub</label>
                <input
                  type="text"
                  className={styles.inputDisabled}
                  value={hubs.length > 0 ? hubs[0].name : 'Loading hub...'}
                  disabled
                  readOnly
                />
              </div>

              {/* To Store */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  To Store <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                >
                  <option value="">Select a store...</option>
                  {Object.entries(storesByRegion).map(([region, stores]) => (
                    <optgroup key={region} label={region}>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name} ({store.daysRemaining} days remaining)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Ingredients */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Ingredients <span className={styles.required}>*</span>
                </label>
                <div className={styles.ingredientTable}>
                  <div className={styles.ingredientTableHeader}>
                    <div className={styles.ingredientCol}>Ingredient</div>
                    <div className={styles.ingredientCol}>Qty</div>
                    <div className={styles.ingredientCol}>Unit</div>
                    <div className={styles.ingredientCol}>AI Suggested</div>
                    <div className={styles.ingredientCol}>Action</div>
                  </div>

                  {ingredients.map((ingredient, index) => (
                    <div key={index} className={styles.ingredientRow}>
                      <select
                        className={styles.ingredientSelect}
                        value={ingredient.name}
                        onChange={(e) =>
                          handleIngredientChange(index, 'name', e.target.value)
                        }
                      >
                        <option value="">Select...</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.item_name}>
                            {item.item_name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        className={styles.ingredientQtyInput}
                        value={ingredient.qty}
                        onChange={(e) =>
                          handleIngredientChange(index, 'qty', e.target.value)
                        }
                        placeholder="0"
                        min="0"
                      />

                      <select
                        className={styles.ingredientUnitSelect}
                        value={ingredient.unit}
                        onChange={(e) =>
                          handleIngredientChange(index, 'unit', e.target.value)
                        }
                      >
                        <option value="cases">cases</option>
                        <option value="boxes">boxes</option>
                        <option value="units">units</option>
                      </select>

                      <div className={styles.aiSuggested}>
                        <span className={styles.aiSuggestedText}>
                          (Suggested: {ingredient.aiSuggested})
                        </span>
                        {ingredient.aiSuggested > 0 && (
                          <button
                            className={styles.fillAiButton}
                            onClick={() => handleFillAISuggestion(index)}
                            title="Fill with AI suggestion"
                          >
                            ✓
                          </button>
                        )}
                      </div>

                      <button
                        className={styles.deleteIngredientButton}
                        onClick={() => handleRemoveIngredient(index)}
                        disabled={ingredients.length === 1}
                        title="Delete ingredient"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className={styles.addIngredientButton}
                  onClick={handleAddIngredient}
                >
                  + Add Ingredient
                </button>
              </div>

              {/* Delivery Source */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Delivery Source <span className={styles.required}>*</span>
                </label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="deliveryType"
                      value="hub"
                      checked={deliveryType === 'hub'}
                      onChange={(e) => setDeliveryType(e.target.value)}
                    />
                    <span>Request from Supply Hub</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="deliveryType"
                      value="nearby"
                      checked={deliveryType === 'nearby'}
                      onChange={(e) => setDeliveryType(e.target.value)}
                    />
                    <span>Request from Nearby Store</span>
                  </label>
                </div>

                {deliveryType === 'nearby' && (
                  <select
                    className={styles.formSelect}
                    value={sourceStore}
                    onChange={(e) => setSourceStore(e.target.value)}
                    style={{ marginTop: 'var(--spacing-s)' }}
                  >
                    <option value="">Select source store...</option>
                    {stores.filter((s) => s.id !== toStoreId).map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Special Instructions */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Special Instructions</label>
                <textarea
                  className={styles.formTextarea}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Add any special notes..."
                  rows="4"
                />
              </div>

              {/* Form Buttons */}
              <div className={styles.formButtons}>
                <button
                  className={styles.submitButton}
                  onClick={handleSubmitRequest}
                >
                  Submit Request
                </button>
                <button
                  className={styles.cancelFormButton}
                  onClick={() => {
                    setShowNewRequestDrawer(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={styles.toast}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
