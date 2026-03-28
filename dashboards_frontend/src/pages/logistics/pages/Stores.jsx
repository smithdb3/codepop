import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { STORES, INVENTORY_ITEMS } from '../mockData';
import { DataTable } from '../../super-admin/components/DataTable';
import styles from './Stores.module.css';

export function Stores({ onNavigate }) {
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [selectedStores, setSelectedStores] = useState(new Set());
  const [selectedStore, setSelectedStore] = useState(null);
  const [drawerTab, setDrawerTab] = useState('summary');
  const [historyLimit, setHistoryLimit] = useState(10);

  // Get unique regions from STORES
  const regions = useMemo(() => {
    const regionSet = new Set(STORES.map((s) => s.region));
    return Array.from(regionSet).sort();
  }, []);

  // Filter stores
  const filteredStores = useMemo(() => {
    return STORES.filter((store) => {
      const matchesSearch =
        search === '' ||
        store.name.toLowerCase().includes(search.toLowerCase());
      const matchesHealth =
        filterHealth === 'all' || store.supplyHealthStatus === filterHealth;
      const matchesRegion =
        filterRegion === 'all' || store.region === filterRegion;
      return matchesSearch && matchesHealth && matchesRegion;
    });
  }, [search, filterHealth, filterRegion]);

  // Check if any filter is active
  const hasActiveFilter =
    search !== '' || filterHealth !== 'all' || filterRegion !== 'all';

  // Toggle store selection
  const toggleStoreSelection = (storeId) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId);
    } else {
      newSelected.add(storeId);
    }
    setSelectedStores(newSelected);
  };

  // Select/deselect all visible stores
  const toggleSelectAll = () => {
    if (selectedStores.size === filteredStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(filteredStores.map((s) => s.id)));
    }
  };

  // Get supply health badge color and label
  const getHealthBadge = (status) => {
    switch (status) {
      case 'critical':
        return { color: '#EF4444', bgColor: '#FEE2E2', label: 'Critical' };
      case 'low':
        return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Low' };
      case 'good':
        return { color: '#10B981', bgColor: '#DCFCE7', label: 'Good' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', label: 'Unknown' };
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Open drawer and update selected store
  const openDrawer = (store) => {
    setSelectedStore(store);
    setDrawerTab('summary');
  };

  // Close drawer
  const closeDrawer = () => {
    setSelectedStore(null);
  };

  // Grid View
  const GridView = () => (
    <div className={styles.storeGrid}>
      {filteredStores.map((store) => {
        const healthBadge = getHealthBadge(store.supplyHealthStatus);
        return (
          <div key={store.id} className={styles.storeCard}>
            <div className={styles.cardCheckbox}>
              <input
                type="checkbox"
                checked={selectedStores.has(store.id)}
                onChange={() => toggleStoreSelection(store.id)}
                aria-label={`Select ${store.name}`}
              />
            </div>

            <div className={styles.cardContent}>
              <div className={styles.storeHeader}>
                <h3 className={styles.storeName}>{store.name}</h3>
                <span
                  className={styles.healthBadge}
                  style={{
                    color: healthBadge.color,
                    backgroundColor: healthBadge.bgColor,
                  }}
                >
                  {healthBadge.label}
                </span>
              </div>

              <p className={styles.storeAddress}>{store.address}</p>

              <div className={styles.daysSection}>
                <div
                  className={styles.daysNumber}
                  style={{
                    color:
                      store.daysRemaining <= 1
                        ? '#EF4444'
                        : store.daysRemaining <= 3
                        ? '#F59E0B'
                        : '#10B981',
                  }}
                >
                  {store.daysRemaining}
                </div>
                <div className={styles.daysLabel}>days remaining</div>
              </div>

              <p className={styles.restockDate}>
                Restock by: {formatDate(store.restockByDate)}
              </p>

              <div className={styles.cardActions}>
                <button
                  className={styles.detailsBtn}
                  onClick={() => openDrawer(store)}
                >
                  View Details
                </button>
                <button
                  className={styles.requestBtn}
                  onClick={() => onNavigate('requests')}
                >
                  Request Supply
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Table View
  const TableView = () => {
    const tableColumns = [
      {
        key: 'checkbox',
        label: (
          <input
            type="checkbox"
            checked={
              filteredStores.length > 0 &&
              selectedStores.size === filteredStores.length
            }
            onChange={toggleSelectAll}
            aria-label="Select all stores"
          />
        ),
        sortable: false,
        render: (_, row) => (
          <input
            type="checkbox"
            checked={selectedStores.has(row.id)}
            onChange={() => toggleStoreSelection(row.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: 'name',
        label: 'Store Name & Location',
        render: (_, row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              {row.address}
            </div>
          </div>
        ),
      },
      {
        key: 'region',
        label: 'Region',
      },
      {
        key: 'supplyHealthStatus',
        label: 'Supply Health',
        render: (status) => {
          const badge = getHealthBadge(status);
          return (
            <span
              style={{
                color: badge.color,
                backgroundColor: badge.bgColor,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {badge.label}
            </span>
          );
        },
      },
      {
        key: 'daysRemaining',
        label: 'Days Remaining',
        render: (days) => (
          <span
            style={{
              color:
                days <= 1 ? '#EF4444' : days <= 3 ? '#F59E0B' : '#10B981',
              fontWeight: 500,
            }}
          >
            {days}
          </span>
        ),
      },
      {
        key: 'restockByDate',
        label: 'Restock Date',
        render: (date) => formatDate(date),
      },
      {
        key: 'activeRequests',
        label: 'Active Requests',
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => (
          <button
            className={styles.tableActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              openDrawer(row);
            }}
          >
            Details
          </button>
        ),
      },
    ];

    return (
      <DataTable
        columns={tableColumns}
        data={filteredStores}
        searchable={false}
        rowsPerPage={25}
        onRowClick={(row) => openDrawer(row)}
      />
    );
  };

  // Store Detail Drawer - Summary Tab
  const SummaryTab = ({ store }) => (
    <div className={styles.drawerTabContent}>
      <div className={styles.summarySection}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Address</span>
          <span className={styles.summaryValue}>{store.address}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Region</span>
          <span className={styles.summaryValue}>{store.region}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Supply Health</span>
          <span className={styles.summaryValue}>
            {(() => {
              const badge = getHealthBadge(store.supplyHealthStatus);
              return (
                <span
                  style={{
                    color: badge.color,
                    backgroundColor: badge.bgColor,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {badge.label}
                </span>
              );
            })()}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Days Remaining</span>
          <span
            className={styles.summaryValue}
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color:
                store.daysRemaining <= 1
                  ? '#EF4444'
                  : store.daysRemaining <= 3
                  ? '#F59E0B'
                  : '#10B981',
            }}
          >
            {store.daysRemaining}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Restock By</span>
          <span className={styles.summaryValue}>
            {formatDate(store.restockByDate)}
          </span>
        </div>
      </div>

      <div className={styles.ingredientProgressSection}>
        <h4 className={styles.sectionTitle}>Ingredient Levels</h4>
        {store.ingredientLevels.map((item) => {
          const color =
            item.pct < 20 ? '#EF4444' : item.pct < 50 ? '#F59E0B' : '#10B981';
          return (
            <div key={item.category} className={styles.progressItem}>
              <div className={styles.progressLabel}>
                <span>{item.category}</span>
                <span style={{ fontWeight: 500, color }}>{item.pct}%</span>
              </div>
              <div className={styles.progressBarOuter}>
                <div
                  className={styles.progressBarInner}
                  style={{ width: `${item.pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.forecastSection}>
        <h4 className={styles.sectionTitle}>AI Forecast</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={store.forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine y={20} stroke="#EF4444" strokeDasharray="3 3" />
            <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="level"
              stroke="#FF2E63"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Store Detail Drawer - Ingredients Tab
  const IngredientsTab = ({ store }) => (
    <div className={styles.drawerTabContent}>
      <div className={styles.ingredientsTable}>
        <div className={styles.ingredientsHeader}>
          <div className={styles.ingredientsCol1}>Name</div>
          <div className={styles.ingredientsCol2}>Category</div>
          <div className={styles.ingredientsCol3}>Level</div>
          <div className={styles.ingredientsCol4}>Avg Usage</div>
          <div className={styles.ingredientsCol5}>Days Rem.</div>
        </div>
        {INVENTORY_ITEMS.map((item) => (
          <div key={item.id} className={styles.ingredientsRow}>
            <div className={styles.ingredientsCol1}>{item.name}</div>
            <div className={styles.ingredientsCol2}>{item.category}</div>
            <div className={styles.ingredientsCol3}>
              <span
                style={{
                  color:
                    item.currentLevelPct < 20
                      ? '#EF4444'
                      : item.currentLevelPct < 50
                      ? '#F59E0B'
                      : '#10B981',
                  fontWeight: 500,
                }}
              >
                {item.currentLevelPct}%
              </span>
            </div>
            <div className={styles.ingredientsCol4}>{item.avgDailyUsage}</div>
            <div className={styles.ingredientsCol5}>{item.daysRemaining}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Store Detail Drawer - Requests Tab
  const RequestsTab = ({ store }) => (
    <div className={styles.drawerTabContent}>
      {store.requests.length > 0 ? (
        <div className={styles.requestsList}>
          {store.requests.map((req) => (
            <div key={req.id} className={styles.requestItem}>
              <div className={styles.requestHeader}>
                <a href="#" style={{ color: '#08D9D6', textDecoration: 'none' }}>
                  {req.id}
                </a>
                <span
                  className={styles.requestStatus}
                  style={{
                    backgroundColor:
                      req.status === 'pending'
                        ? '#FEF3C7'
                        : req.status === 'approved'
                        ? '#DBEAFE'
                        : '#DCFCE7',
                    color:
                      req.status === 'pending'
                        ? '#B45309'
                        : req.status === 'approved'
                        ? '#1E40AF'
                        : '#166534',
                  }}
                >
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
              </div>
              <p className={styles.requestSummary}>{req.summary}</p>
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>
                  {formatDate(req.submittedDate)}
                </span>
                <span className={styles.requestEta}>
                  ETA: {formatDate(req.eta)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyMessage}>No active requests for this store.</p>
      )}
      <button
        className={styles.newRequestBtn}
        onClick={() => onNavigate('requests')}
      >
        New Request for This Store
      </button>
    </div>
  );

  // Store Detail Drawer - History Tab
  const HistoryTab = ({ store }) => {
    const sortedHistory = [...store.history].reverse();
    const displayedHistory = sortedHistory.slice(0, historyLimit);

    return (
      <div className={styles.drawerTabContent}>
        {displayedHistory.length > 0 ? (
          <div className={styles.historyList}>
            {displayedHistory.map((item, idx) => (
              <div key={idx} className={styles.historyItem}>
                <div className={styles.historyDate}>{formatDate(item.date)}</div>
                <p className={styles.historyIngredients}>
                  <strong>Items:</strong> {item.ingredients}
                </p>
                <p className={styles.historyDetail}>
                  <strong>Qty:</strong> {item.qty}
                </p>
                <p className={styles.historyDetail}>
                  <strong>From:</strong> {item.fromLocation}
                </p>
                {item.notes && (
                  <p className={styles.historyNotes}>
                    <strong>Notes:</strong> {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>No delivery history.</p>
        )}
        {sortedHistory.length > historyLimit && (
          <button
            className={styles.loadMoreBtn}
            onClick={() => setHistoryLimit((prev) => prev + 10)}
          >
            Load More
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Stores</h1>
        <div className={styles.headerControls}>
          {/* View Toggle */}
          <div className={styles.viewToggleGroup}>
            <button
              className={`${styles.viewToggleBtn} ${
                viewMode === 'grid' ? styles.active : ''
              }`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`${styles.viewToggleBtn} ${
                viewMode === 'table' ? styles.active : ''
              }`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>

          {/* Request Supply Button */}
          <button
            className={styles.primaryBtn}
            disabled={selectedStores.size === 0}
            onClick={() => onNavigate('requests')}
          >
            Request Supply for Selected
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by store name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={filterHealth}
          onChange={(e) => setFilterHealth(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Supply Health</option>
          <option value="critical">Critical</option>
          <option value="low">Low</option>
          <option value="good">Good</option>
        </select>

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            className={styles.clearFiltersBtn}
            onClick={() => {
              setSearch('');
              setFilterHealth('all');
              setFilterRegion('all');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {filteredStores.length > 0 ? (
        viewMode === 'grid' ? (
          <GridView />
        ) : (
          <TableView />
        )
      ) : (
        <div className={styles.emptyState}>
          No stores match your filters.
        </div>
      )}

      {/* Store Detail Drawer */}
      {selectedStore && (
        <>
          <div className={styles.drawerBackdrop} onClick={closeDrawer} />
          <div className={styles.drawer}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleSection}>
                <h2 className={styles.drawerTitle}>{selectedStore.name}</h2>
                <span
                  className={styles.drawerHealthBadge}
                  style={{
                    color: getHealthBadge(selectedStore.supplyHealthStatus)
                      .color,
                    backgroundColor: getHealthBadge(
                      selectedStore.supplyHealthStatus
                    ).bgColor,
                  }}
                >
                  {getHealthBadge(selectedStore.supplyHealthStatus).label}
                </span>
              </div>
              <button
                className={styles.closeDrawerBtn}
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className={styles.drawerTabs}>
              {['summary', 'ingredients', 'requests', 'history'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.drawerTab} ${
                    drawerTab === tab ? styles.active : ''
                  }`}
                  onClick={() => setDrawerTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className={styles.drawerBody}>
              {drawerTab === 'summary' && <SummaryTab store={selectedStore} />}
              {drawerTab === 'ingredients' && (
                <IngredientsTab store={selectedStore} />
              )}
              {drawerTab === 'requests' && <RequestsTab store={selectedStore} />}
              {drawerTab === 'history' && <HistoryTab store={selectedStore} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
