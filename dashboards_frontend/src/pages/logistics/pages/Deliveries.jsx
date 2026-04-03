import React, { useState, useEffect } from 'react';
import { RECURRING_SCHEDULES } from '../mockData';
import { getLogisticsDeliveries, createDelivery, getDrivers } from '../../../api/deliveries';
import { getLogisticsStores } from '../../../api/stores';
import styles from './Deliveries.module.css';

export function Deliveries({ onNavigate }) {
  // Main view state
  const [subView, setSubView] = useState('planning'); // 'planning' | 'route' | 'automated'

  // Route Builder state
  const [storeSearch, setStoreSearch] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    driver: '',
    notes: '',
  });
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Delivery API state
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Automated Scheduling state
  const [automatedForm, setAutomatedForm] = useState({
    pattern: 'weekly',
    dayOfWeek: 'Monday',
    timeStart: '09:00',
    timeEnd: '17:00',
    hub: 'Chicago Hub',
    targetStores: [],
    notes: '',
  });
  const [schedules, setSchedules] = useState(RECURRING_SCHEDULES);

  // Fetch deliveries, drivers, and stores on mount
  useEffect(() => {
    setLoadingDeliveries(true);
    Promise.all([getLogisticsDeliveries(), getDrivers(), getLogisticsStores()])
      .then(([deliveriesData, driversData, storesData]) => {
        setDeliveries(deliveriesData || []);
        setDrivers(driversData || []);
        setStores(storesData || []);
      })
      .catch((err) => {
        console.error('Failed to load deliveries, drivers, or stores:', err);
      })
      .finally(() => setLoadingDeliveries(false));
  }, []);

  // Toast auto-hide effect
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ visible: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Filter deliveries for planning view
  const plannedDeliveries = deliveries;

  // Get stores not in route (using real store data from API)
  const availableStores = stores.filter(
    (store) => !routeStops.some((rs) => rs.id === store.id)
  ).filter((store) =>
    store.store_name.toLowerCase().includes(storeSearch.toLowerCase()) ||
    store.location.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // Handle drag start
  const handleDragStart = (e, index) => {
    setDragItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragItem === null || dragItem === dropIndex) return;

    const newRouteStops = [...routeStops];
    const draggedItem = newRouteStops[dragItem];
    newRouteStops.splice(dragItem, 1);
    newRouteStops.splice(dropIndex, 0, draggedItem);

    setRouteStops(newRouteStops);
    setDragItem(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDragItem(null);
  };

  // Add store to route
  const handleAddStoreToRoute = (store) => {
    setRouteStops([...routeStops, store]);
  };

  // Remove store from route
  const handleRemoveFromRoute = (index) => {
    setRouteStops(routeStops.filter((_, i) => i !== index));
  };

  // Suggest route (pre-populate from planning view)
  const handleSuggestDeliveryRoute = () => {
    const urgentStores = STORES.filter(
      (s) =>
        s.supplyHealthStatus === 'critical' ||
        (s.daysRemaining >= 0 && s.daysRemaining <= 3)
    ).sort((a, b) => a.daysRemaining - b.daysRemaining);
    setRouteStops(urgentStores);
    setSubView('route');
  };

  // Optimize route (sort by daysRemaining)
  const handleOptimizeRoute = () => {
    const optimized = [...routeStops].sort(
      (a, b) => a.daysRemaining - b.daysRemaining
    );
    setRouteStops(optimized);
  };

  // Open maps
  const handleOpenMaps = () => {
    if (routeStops.length === 0) return;
    const addresses = routeStops
      .map((s) => encodeURIComponent(s.address))
      .join('/');
    const mapsUrl = `https://www.google.com/maps/dir/${addresses}`;
    window.open(mapsUrl, '_blank');
  };

  // Schedule delivery
  const handleAcceptAndSchedule = () => {
    setShowScheduleModal(true);
  };

  // Confirm schedule
  const handleConfirmSchedule = async () => {
    if (!scheduleForm.date || !scheduleForm.driver) {
      alert('Please fill in date and driver');
      return;
    }

    try {
      // Use hub id=1 as default
      const hubId = 1;
      const storeIds = routeStops.map((s) => s.id);

      await createDelivery({
        hub: hubId,
        driver_id: parseInt(scheduleForm.driver),
        store_ids: storeIds,
        route: storeIds,
        delivery_date: scheduleForm.date,
        eta: `${scheduleForm.date}T09:00:00`,
        notes: scheduleForm.notes,
      });

      // Refresh list
      const updated = await getLogisticsDeliveries();
      setDeliveries(updated || []);

      setShowScheduleModal(false);
      setRouteStops([]);
      setScheduleForm({ date: '', driver: '', notes: '' });
      setToast({ visible: true, message: 'Route scheduled successfully!' });
    } catch (err) {
      console.error('Failed to create delivery:', err);
      setToast({ visible: true, message: 'Failed to schedule delivery. Try again.' });
    }
  };

  // Cancel schedule
  const handleCancelSchedule = () => {
    setShowScheduleModal(false);
    setScheduleForm({ date: '', driver: '', notes: '' });
  };

  // Add all stores to route
  const handleAddAllToRoute = () => {
    setRouteStops(availableStores);
  };

  // Save recurring schedule
  const handleSaveRecurringSchedule = () => {
    if (!automatedForm.dayOfWeek || automatedForm.targetStores.length === 0) {
      alert('Please select day of week and at least one store');
      return;
    }
    const newSchedule = {
      id: `RS-${schedules.length + 1}`,
      pattern: automatedForm.pattern,
      dayOfWeek: automatedForm.dayOfWeek,
      timeWindowStart: automatedForm.timeStart,
      timeWindowEnd: automatedForm.timeEnd,
      hub: automatedForm.hub,
      stores: automatedForm.targetStores,
      nextRunDate: new Date().toISOString().split('T')[0],
      intervalDays: automatedForm.pattern === 'weekly' ? 7 : automatedForm.pattern === 'biweekly' ? 14 : 0,
    };
    setSchedules([...schedules, newSchedule]);
    setAutomatedForm({
      pattern: 'weekly',
      dayOfWeek: 'Monday',
      timeStart: '09:00',
      timeEnd: '17:00',
      hub: 'Chicago Hub',
      targetStores: [],
      notes: '',
    });
    setToast({ visible: true, message: 'Recurring schedule created!' });
  };

  // Delete schedule
  const handleDeleteSchedule = (id) => {
    setSchedules(schedules.filter((s) => s.id !== id));
    setToast({ visible: true, message: 'Schedule deleted.' });
  };

  // Pause schedule (placeholder)
  const handlePauseSchedule = (id) => {
    setToast({ visible: true, message: 'Schedule paused.' });
  };

  // Get status badge style
  const getStatusBadgeStyle = (window) => {
    switch (window) {
      case 'immediate':
        return { bg: '#FEE2E2', color: '#DC2626', label: 'Immediate' };
      case 'this_week':
        return { bg: '#FEF3C7', color: '#D97706', label: 'This Week' };
      case 'next_week':
        return { bg: '#DCFCE7', color: '#059669', label: 'Next Week' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', label: 'OK' };
    }
  };

  const getStoreSupplyBadge = (pct) => {
    if (pct <= 15) return { bg: '#FEE2E2', text: '#DC2626' };
    if (pct <= 35) return { bg: '#FEF3C7', text: '#D97706' };
    if (pct <= 65) return { bg: '#DBEAFE', text: '#1E40AF' };
    return { bg: '#DCFCE7', text: '#059669' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const estimatedTime = routeStops.length * 45;

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Deliveries</h1>
      </div>

      {/* Sub-nav Button Group */}
      <div className={styles.subNavGroup}>
        <button
          className={`${styles.navBtn} ${subView === 'planning' ? styles.navBtnActive : ''}`}
          onClick={() => setSubView('planning')}
        >
          Planning
        </button>
        <button
          className={`${styles.navBtn} ${subView === 'route' ? styles.navBtnActive : ''}`}
          onClick={() => setSubView('route')}
        >
          Route Builder
        </button>
        <button
          className={`${styles.navBtn} ${subView === 'automated' ? styles.navBtnActive : ''}`}
          onClick={() => setSubView('automated')}
        >
          Automated
        </button>
      </div>

      {/* SUB-VIEW 1: PLANNING */}
      {subView === 'planning' && (
        <div className={styles.subView}>
          <div className={styles.viewHeader}>
            <h2 className={styles.viewTitle}>Planned Deliveries</h2>
            <button
              className={styles.primaryBtn}
              onClick={handleSuggestDeliveryRoute}
            >
              Suggest Delivery Route
            </button>
          </div>

          {plannedDeliveries.length > 0 ? (
            <div className={styles.customTable}>
              <div className={styles.tableHeader}>
                <div className={styles.colStoreName}>Store Name & Location</div>
                <div className={styles.colSupply}>Current Supply %</div>
                <div className={styles.colDepletion}>Forecasted Depletion</div>
                <div className={styles.colRestock}>Restock Window</div>
                <div className={styles.colLastDel}>Last Delivery</div>
                <div className={styles.colActions}>Actions</div>
              </div>

              {plannedDeliveries.map((delivery) => {
                const isUrgent =
                  delivery.suggestedRestockWindow === 'immediate';
                const badgeStyle = getStatusBadgeStyle(
                  delivery.suggestedRestockWindow
                );

                return (
                  <div
                    key={delivery.id}
                    className={`${styles.tableRow} ${
                      isUrgent ? styles.urgentRow : ''
                    }`}
                  >
                    <div className={styles.colStoreName}>
                      <div className={styles.storeName}>
                        {delivery.storeName}
                      </div>
                      <div className={styles.storeAddress}>
                        {delivery.storeAddress}
                      </div>
                    </div>
                    <div className={styles.colSupply}>
                      <span
                        className={styles.supplyBadge}
                        style={getStoreSupplyBadge(delivery.currentSupplyPct)}
                      >
                        {delivery.currentSupplyPct}%
                      </span>
                    </div>
                    <div className={styles.colDepletion}>
                      {formatDate(delivery.forecastedDepletionDate)}
                    </div>
                    <div className={styles.colRestock}>
                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color,
                        }}
                      >
                        {badgeStyle.label}
                      </span>
                    </div>
                    <div className={styles.colLastDel}>
                      {formatDate(delivery.lastDelivery)}
                    </div>
                    <div className={styles.colActions}>
                      <button className={styles.actionLink}>
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No planned deliveries at this time.
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: ROUTE BUILDER */}
      {subView === 'route' && (
        <div className={styles.subView}>
          <div className={styles.routeHeader}>
            <h2 className={styles.viewTitle}>Route Builder</h2>
          </div>

          <div className={styles.splitLayout}>
            {/* Left Panel: Store Selector */}
            <div className={styles.leftPanel}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Available Stores</h3>

                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search stores..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />

                {availableStores.length > 0 && (
                  <button
                    className={styles.ghostBtn}
                    onClick={handleAddAllToRoute}
                  >
                    + Add All to Route
                  </button>
                )}

                <div className={styles.storesScrollable}>
                  {availableStores.length > 0 ? (
                    availableStores.map((store) => (
                      <div
                        key={store.id}
                        className={styles.storeRow}
                      >
                        <div className={styles.storeInfo}>
                          <div className={styles.storeRowName}>
                            {store.store_name}
                          </div>
                          <div className={styles.storeRowAddress}>
                            {store.location}
                          </div>
                        </div>
                        <button
                          className={styles.smallBtn}
                          onClick={() => handleAddStoreToRoute(store)}
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyStates}>
                      {storeSearch
                        ? 'No stores match your search.'
                        : 'All stores are in route.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Route Sequence */}
            <div className={styles.rightPanel}>
              <div className={styles.card}>
                <div className={styles.routeHeader2}>
                  <h3 className={styles.cardTitle}>Route Sequence</h3>
                  <span className={styles.estimatedTime}>
                    {estimatedTime} min
                  </span>
                </div>

                {routeStops.length > 0 ? (
                  <ol className={styles.routeList}>
                    {routeStops.map((stop, index) => (
                      <li
                        key={stop.id}
                        className={`${styles.routeStopRow} ${
                          dragItem === index ? styles.dragging : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className={styles.dragHandle}>⋮⋮</span>
                        <span className={styles.stopNumber}>{index + 1}</span>
                        <div className={styles.stopContent}>
                          <div className={styles.stopName}>{stop.name}</div>
                          <div className={styles.stopAddress}>
                            {stop.address}
                          </div>
                          <div className={styles.stopTime}>
                            ~{(index + 1) * 45} min from start
                          </div>
                        </div>
                        <button
                          className={styles.removeBtn}
                          onClick={() => handleRemoveFromRoute(index)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className={styles.emptyState}>
                    Add stores from left panel to create route
                  </div>
                )}

                <div className={styles.routeActions}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={handleOptimizeRoute}
                    disabled={routeStops.length === 0}
                  >
                    AI Suggest Optimal Route
                  </button>
                  <button
                    className={styles.ghostBtn}
                    onClick={handleOpenMaps}
                    disabled={routeStops.length === 0}
                  >
                    Open Route in Maps
                  </button>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleAcceptAndSchedule}
                    disabled={routeStops.length === 0}
                  >
                    Accept & Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Modal */}
          {showScheduleModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h2 className={styles.modalTitle}>Schedule Delivery</h2>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={scheduleForm.date}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, date: e.target.value })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Driver</label>
                  <select
                    className={styles.input}
                    value={scheduleForm.driver}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        driver: e.target.value,
                      })
                    }
                  >
                    <option value="">Select driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Notes</label>
                  <textarea
                    className={styles.textarea}
                    value={scheduleForm.notes}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Add delivery notes..."
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleConfirmSchedule}
                  >
                    Confirm & Save
                  </button>
                  <button
                    className={styles.ghostBtn}
                    onClick={handleCancelSchedule}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: AUTOMATED SCHEDULING */}
      {subView === 'automated' && (
        <div className={styles.subView}>
          <div className={styles.automatedContainer}>
            {/* Form Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Create Recurring Delivery Schedule</h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>Pattern</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="weekly"
                      checked={automatedForm.pattern === 'weekly'}
                      onChange={(e) =>
                        setAutomatedForm({
                          ...automatedForm,
                          pattern: e.target.value,
                        })
                      }
                    />
                    Weekly
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="biweekly"
                      checked={automatedForm.pattern === 'biweekly'}
                      onChange={(e) =>
                        setAutomatedForm({
                          ...automatedForm,
                          pattern: e.target.value,
                        })
                      }
                    />
                    Bi-weekly
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="custom"
                      checked={automatedForm.pattern === 'custom'}
                      onChange={(e) =>
                        setAutomatedForm({
                          ...automatedForm,
                          pattern: e.target.value,
                        })
                      }
                    />
                    Custom
                  </label>
                </div>
              </div>

              {automatedForm.pattern === 'custom' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Interval (days)</label>
                  <input
                    type="number"
                    className={styles.input}
                    min="1"
                    placeholder="Number of days"
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Day of Week</label>
                <select
                  className={styles.input}
                  value={automatedForm.dayOfWeek}
                  onChange={(e) =>
                    setAutomatedForm({
                      ...automatedForm,
                      dayOfWeek: e.target.value,
                    })
                  }
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.timeInputsRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Time</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={automatedForm.timeStart}
                    onChange={(e) =>
                      setAutomatedForm({
                        ...automatedForm,
                        timeStart: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End Time</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={automatedForm.timeEnd}
                    onChange={(e) =>
                      setAutomatedForm({
                        ...automatedForm,
                        timeEnd: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Hub</label>
                <input
                  type="text"
                  className={styles.input}
                  value={automatedForm.hub}
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Stores</label>
                <div className={styles.storesCheckboxList}>
                  {STORES.map((store) => (
                    <label key={store.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={automatedForm.targetStores.includes(
                          store.id
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAutomatedForm({
                              ...automatedForm,
                              targetStores: [
                                ...automatedForm.targetStores,
                                store.id,
                              ],
                            });
                          } else {
                            setAutomatedForm({
                              ...automatedForm,
                              targetStores: automatedForm.targetStores.filter(
                                (id) => id !== store.id
                              ),
                            });
                          }
                        }}
                      />
                      {store.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Notes</label>
                <textarea
                  className={styles.textarea}
                  value={automatedForm.notes}
                  onChange={(e) =>
                    setAutomatedForm({
                      ...automatedForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Add schedule notes..."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.primaryBtn}
                  onClick={handleSaveRecurringSchedule}
                >
                  Save Recurring Schedule
                </button>
                <button className={styles.ghostBtn}>Cancel</button>
              </div>
            </div>

            {/* Existing Schedules */}
            {schedules.length > 0 && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Active Recurring Schedules</h3>

                <div className={styles.customTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.colPattern}>Pattern</div>
                    <div className={styles.colNextRun}>Next Run</div>
                    <div className={styles.colStoresCount}>Stores</div>
                    <div className={styles.colTimeWindow}>Time Window</div>
                    <div className={styles.colHub}>Hub</div>
                    <div className={styles.colActions}>Actions</div>
                  </div>

                  {schedules.map((schedule) => (
                    <div key={schedule.id} className={styles.tableRow}>
                      <div className={styles.colPattern}>
                        {schedule.pattern.charAt(0).toUpperCase() +
                          schedule.pattern.slice(1)}{' '}
                        ({schedule.dayOfWeek})
                      </div>
                      <div className={styles.colNextRun}>
                        {formatDate(schedule.nextRunDate)}
                      </div>
                      <div className={styles.colStoresCount}>
                        {schedule.stores.length}
                      </div>
                      <div className={styles.colTimeWindow}>
                        {schedule.timeWindowStart}–{schedule.timeWindowEnd}
                      </div>
                      <div className={styles.colHub}>{schedule.hub}</div>
                      <div className={styles.colActions}>
                        <button className={styles.actionLink}>Edit</button>
                        <button
                          className={styles.actionLink}
                          onClick={() => handlePauseSchedule(schedule.id)}
                        >
                          Pause
                        </button>
                        <button
                          className={`${styles.actionLink} ${styles.actionLinkDanger}`}
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={styles.toast}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
