import React, { useState, useEffect } from 'react';
import { KPICard } from '../../super-admin/components/KPICard';
import {
  LOGISTICS_MANAGER,
  STORES,
  KPI_DATA,
  HUB_STATUS,
} from '../mockData';
import { getDeliveriesKPI, getLogisticsDeliveries } from '../../../api/deliveries';
import styles from './Overview.module.css';

export function Overview({ onNavigate }) {
  const [dismissedCriticalBanner, setDismissedCriticalBanner] = useState(false);
  const [dismissedWarningBanner, setDismissedWarningBanner] = useState(false);
  const [deliveriesInTransit, setDeliveriesInTransit] = useState(KPI_DATA.deliveriesInTransit);
  const [liveDeliveries, setLiveDeliveries] = useState([]);

  // Fetch deliveries KPI and live deliveries on mount
  useEffect(() => {
    getDeliveriesKPI()
      .then((data) => {
        if (data && data.deliveriesInTransit !== undefined) {
          setDeliveriesInTransit(data.deliveriesInTransit);
        }
      })
      .catch((err) => console.error('Failed to load deliveries KPI:', err));

    getLogisticsDeliveries({ status: 'in_transit' })
      .then((data) => setLiveDeliveries(data || []))
      .catch(() => {});
  }, []);

  // Count stores by supply health status
  const criticalStores = STORES.filter((s) => s.supplyHealthStatus === 'critical');
  const lowStores = STORES.filter((s) => s.supplyHealthStatus === 'low');

  // Filter stores needing attention: critical or low, sorted by daysRemaining (ascending)
  const storesNeedingAttention = STORES.filter(
    (s) => s.supplyHealthStatus === 'critical' || s.supplyHealthStatus === 'low'
  )
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  // Filter deliveries in transit or scheduled, limit to 5
  const upcomingDeliveries = liveDeliveries
    .filter((d) => d.status === 'in_transit' || d.status === 'scheduled')
    .slice(0, 5);

  // Format time
  const formatTime = (isoTime) => {
    if (!isoTime) return 'N/A';
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get inventory percentage color
  const getInventoryColor = (pct) => {
    if (pct > 70) return '#10B981';
    if (pct >= 40) return '#F59E0B';
    return '#EF4444';
  };

  // Get days remaining badge color
  const getDaysRemainingColor = (days) => {
    if (days <= 1) return '#EF4444';
    if (days <= 3) return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Logistics Dashboard</h1>
        <div className={styles.contextPill}>
          {LOGISTICS_MANAGER.hub} • {LOGISTICS_MANAGER.region}
        </div>
      </div>

      {/* Critical Alert Banner */}
      {!dismissedCriticalBanner && criticalStores.length > 0 && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>🚨</span>
            <span className={styles.alertText}>
              {criticalStores.length} store{criticalStores.length > 1 ? 's' : ''} at
              critical supply levels (0–1 days remaining).{' '}
              <button
                className={styles.alertLink}
                onClick={() => onNavigate('stores')}
              >
                View Stores →
              </button>
            </span>
          </div>
          <button
            className={styles.alertDismiss}
            onClick={() => setDismissedCriticalBanner(true)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Warning Alert Banner */}
      {!dismissedWarningBanner && lowStores.length > 0 && (
        <div className={`${styles.alertBanner} ${styles.alertBannerWarning}`}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>⚠️</span>
            <span className={styles.alertText}>
              {lowStores.length} store{lowStores.length > 1 ? 's' : ''} at low supply
              levels (2–3 days remaining).{' '}
              <button
                className={styles.alertLink}
                onClick={() => onNavigate('deliveries')}
              >
                Plan Delivery →
              </button>
            </span>
          </div>
          <button
            className={styles.alertDismiss}
            onClick={() => setDismissedWarningBanner(true)}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#EF4444' }}>
          <KPICard
            label="Stores at Critical Supply"
            value={KPI_DATA.storesAtCritical}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#FF2E63' }}>
          <KPICard
            label="Deliveries In Transit"
            value={deliveriesInTransit}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#F59E0B' }}>
          <KPICard
            label="Pending Supply Requests"
            value={KPI_DATA.pendingRequests}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#08D9D6' }}>
          <KPICard
            label="Top Trending Ingredient"
            value={KPI_DATA.topTrendingIngredient}
          />
        </div>
        <div className={styles.kpiWrapper} style={{ '--kpi-accent': '#10B981' }}>
          <KPICard
            label="Forecast Accuracy"
            value="87%"
          />
        </div>
      </div>

      {/* Two-Column Row */}
      <div className={styles.twoCol}>
        {/* Hub Status Card */}
        <div className={styles.twoColLeft}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{HUB_STATUS.name}</h3>

            {/* Inventory % Display */}
            <div className={styles.inventorySection}>
              <div className={styles.inventoryValue} style={{ color: getInventoryColor(HUB_STATUS.inventoryPct) }}>
                {HUB_STATUS.inventoryPct}%
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${HUB_STATUS.inventoryPct}%`,
                    backgroundColor: getInventoryColor(HUB_STATUS.inventoryPct),
                  }}
                />
              </div>
            </div>

            {/* Alert Count Badge */}
            {HUB_STATUS.alertCount > 0 && (
              <div className={styles.alertBadge}>
                {HUB_STATUS.alertCount} alert{HUB_STATUS.alertCount > 1 ? 's' : ''}
              </div>
            )}

            {/* Stat Rows with Emoji */}
            <div className={styles.statRows}>
              <div className={styles.statRow}>
                <span className={styles.statEmoji}>🚚</span>
                <span className={styles.statLabel}>Active Deliveries</span>
                <span className={styles.statValue}>{HUB_STATUS.activeDeliveries}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statEmoji}>📦</span>
                <span className={styles.statLabel}>Stores Needing Restock</span>
                <span className={styles.statValue}>{HUB_STATUS.storesNeedingRestock}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statEmoji}>📋</span>
                <span className={styles.statLabel}>Orders Pending</span>
                <span className={styles.statValue}>{HUB_STATUS.ordersPending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Stores Card */}
        <div className={styles.twoColRight}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Stores Needing Attention</h3>

            {storesNeedingAttention.length > 0 ? (
              <div className={styles.storesList}>
                {storesNeedingAttention.map((store) => (
                  <div key={store.id} className={styles.storeRow}>
                    <div className={styles.storeInfo}>
                      <div className={styles.storeName}>{store.name}</div>
                      <div className={styles.storeLocation}>{store.address}</div>
                    </div>
                    <div className={styles.daysRemaining}>
                      <span
                        className={styles.daysPill}
                        style={{
                          backgroundColor: getDaysRemainingColor(store.daysRemaining),
                        }}
                      >
                        {store.daysRemaining} day{store.daysRemaining !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={styles.restockInfo}>
                      <div className={styles.restockLabel}>
                        Restock by: {formatDate(store.restockByDate)}
                      </div>
                    </div>
                    <button
                      className={styles.requestSupplyBtn}
                      onClick={() => onNavigate('requests')}
                    >
                      Request Supply
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                All stores have adequate supply levels.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Deliveries Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Upcoming Deliveries</h3>
          {upcomingDeliveries.length > 0 && (
            <button
              className={styles.viewAllLink}
              onClick={() => onNavigate('deliveries')}
            >
              View All Deliveries →
            </button>
          )}
        </div>

        {upcomingDeliveries.length > 0 ? (
          <div className={styles.deliveryTable}>
            <div className={styles.deliveryHeader}>
              <div className={styles.deliveryColDestination}>Store Destination</div>
              <div className={styles.deliveryColETA}>ETA</div>
              <div className={styles.deliveryColDriver}>Driver</div>
              <div className={styles.deliveryColStatus}>Status</div>
            </div>
            {upcomingDeliveries.map((delivery) => (
              <div key={delivery.id} className={styles.deliveryRow}>
                <div className={styles.deliveryColDestination}>
                  <div className={styles.deliveryStoreName}>{delivery.storeName}</div>
                  <div className={styles.deliveryStoreAddress}>
                    {delivery.storeAddress}
                  </div>
                </div>
                <div className={styles.deliveryColETA}>
                  {formatDate(delivery.eta)} {formatTime(delivery.eta)}
                </div>
                <div className={styles.deliveryColDriver}>{delivery.driver}</div>
                <div className={styles.deliveryColStatus}>
                  <span
                    className={styles.statusBadge}
                    style={{
                      backgroundColor:
                        delivery.status === 'in_transit' ? '#DBEAFE' : '#DCFCE7',
                      color:
                        delivery.status === 'in_transit' ? '#1E40AF' : '#166534',
                    }}
                  >
                    {delivery.status === 'in_transit' ? 'In Transit' : 'Out for Delivery'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            No deliveries currently in transit or out for delivery.
          </div>
        )}
      </div>
    </div>
  );
}
