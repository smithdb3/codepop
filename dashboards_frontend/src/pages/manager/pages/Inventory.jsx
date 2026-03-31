import React, { useState, useEffect } from 'react';
import { AI_RECOMMENDATIONS } from '../mockData';
import { getManagerInventory } from '../../../api/inventory';
import styles from './Inventory.module.css';

export function Inventory() {
  const [activeTab, setActiveTab] = useState('syrups');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [inventoryItems, setInventoryItems] = useState({
    syrups: [],
    sodas: [],
    addIns: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch inventory from API and group by category
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await getManagerInventory();

        // Group items by category and transform shape
        const grouped = {
          syrups: [],
          sodas: [],
          addIns: [],
        };

        data.forEach((item) => {
          const transformedItem = {
            id: item.id.toString(),
            name: item.item_name,
            level: item.level || item.quantity,
            capacity: item.capacity || item.max_capacity,
            daysRemaining: item.days_remaining,
            trend: item.trend_pct || 0,
            unit: item.unit || 'units',
            pct: item.current_level_pct || Math.round((item.quantity / (item.max_capacity || 1)) * 100),
          };

          if (item.category === 'syrup') {
            grouped.syrups.push(transformedItem);
          } else if (item.category === 'soda') {
            grouped.sodas.push(transformedItem);
          } else if (item.category === 'add-in') {
            grouped.addIns.push(transformedItem);
          }
        });

        setInventoryItems(grouped);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError('Failed to load inventory data');
        // Fall back to empty data instead of mock
        setInventoryItems({
          syrups: [],
          sodas: [],
          addIns: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const tabData = {
    syrups: inventoryItems.syrups,
    sodas: inventoryItems.sodas,
    addIns: inventoryItems.addIns,
  };

  const currentItems = tabData[activeTab];

  const filteredItems = currentItems.filter((item) => {
    if (filterBy === 'critical') return item.pct < 25;
    if (filterBy === 'low') return item.pct >= 25 && item.pct < 50;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'stock') return a.pct - b.pct;
    if (sortBy === 'urgency') return a.daysRemaining - b.daysRemaining;
    return a.name.localeCompare(b.name);
  });

  const getProgressColor = (pct) => {
    if (pct < 25) return '#EF4444';
    if (pct < 50) return '#F59E0B';
    return '#10B981';
  };

  const getTrendIcon = (trend) => {
    return trend < -10 ? '▼▼' : trend < 0 ? '▼' : '→';
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Inventory Management</h1>
        <p>Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Inventory Management</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inventory Management</h1>

      {/* Category Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {Object.keys(tabData).map((tabKey) => (
            <button
              key={tabKey}
              className={`${styles.tab} ${activeTab === tabKey ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tabKey)}
            >
              {tabKey === 'syrups' && 'Syrups'}
              {tabKey === 'sodas' && 'Sodas'}
              {tabKey === 'addIns' && 'Add-ins'}
            </button>
          ))}
        </div>
      </div>

      {/* Sort and Filter Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.sortControl}>
          <label htmlFor="sort">Sort by:</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.select}
          >
            <option value="name">Name</option>
            <option value="stock">Stock Level</option>
            <option value="urgency">Urgency</option>
          </select>
        </div>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${filterBy === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterBy('all')}
          >
            All
          </button>
          <button
            className={`${styles.filterBtn} ${filterBy === 'low' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterBy('low')}
          >
            Low (25-50%)
          </button>
          <button
            className={`${styles.filterBtn} ${filterBy === 'critical' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterBy('critical')}
          >
            Critical (&lt;25%)
          </button>
        </div>
      </div>

      {/* Stock Grid */}
      <div className={styles.stockGrid}>
        {sortedItems.map((item) => (
          <div key={item.id} className={styles.stockCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.itemName}>{item.name}</h3>
              <div
                className={styles.percentBadge}
                style={{ backgroundColor: getProgressColor(item.pct) }}
              >
                {item.pct}%
              </div>
            </div>

            <div className={styles.levelInfo}>
              <span>
                {item.level} / {item.capacity}
              </span>
              <span className={styles.unit}>({item.unit})</span>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(item.pct, 100)}%`,
                  backgroundColor: getProgressColor(item.pct),
                }}
              />
            </div>

            <div className={styles.daysRemaining}>
              <span className={styles.daysLabel}>
                {item.daysRemaining === 0 ? 'Reorder now' : `${item.daysRemaining} days left`}
              </span>
              <span className={styles.trend}>{getTrendIcon(item.trend)}</span>
            </div>

            <button className={styles.addToRequestBtn}>Add to Request</button>
          </div>
        ))}
      </div>

      {/* AI Ordering Recommendations */}
      <div className={styles.recommendationsCard}>
        <div className={styles.recommendationsHeader}>
          <h2 className={styles.recommendationsTitle}>AI Ordering Recommendations</h2>
          <span className={styles.aiLabel}>AI</span>
        </div>
        <div className={styles.recommendationsList}>
          {AI_RECOMMENDATIONS.map((rec, idx) => (
            <div key={idx} className={styles.recommendationItem}>
              <div className={styles.recContent}>
                <div className={styles.recItem}>{rec.item}</div>
                <div className={styles.recDetails}>
                  Suggested: {rec.suggested} {rec.unit} from {rec.supplier}
                </div>
                <div className={styles.recReason}>{rec.reason}</div>
              </div>
            </div>
          ))}
        </div>
        <button className={styles.acceptBtn}>Accept & Order</button>
      </div>

      {/* Cooler Status Grid */}
      <div className={styles.coolerSection}>
        <h2 className={styles.coolerTitle}>Cooler Status</h2>
        <div className={styles.coolerPlaceholder}>
          <div className={styles.comingSoon}>Coming Soon</div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <details className={styles.collapsible}>
        <summary className={styles.collapsibleSummary}>Nearby Store Comparison</summary>
        <div className={styles.collapsibleContent}>
          <p>Comparison data coming soon...</p>
        </div>
      </details>

      <details className={styles.collapsible}>
        <summary className={styles.collapsibleSummary}>Supply Hub Inventory</summary>
        <div className={styles.collapsibleContent}>
          <p>Hub inventory data coming soon...</p>
        </div>
      </details>
    </div>
  );
}
