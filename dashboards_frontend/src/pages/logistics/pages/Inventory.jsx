import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TOP_TRENDING_DATA,
  REGIONAL_VARIATION_DATA,
  SEASONAL_PATTERNS_DATA,
  AI_INSIGHTS,
} from '../mockData';
import { getLogisticsHubStatus } from '../../../api/hubs';
import { getLogisticsHubInventory } from '../../../api/inventory';
import { DataTable } from '../../super-admin/components/DataTable';
import styles from './Inventory.module.css';

export function Inventory({ onNavigate }) {
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('supply');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedHubId, setSelectedHubId] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch hubs and set default hub
  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const hubsData = await getLogisticsHubStatus();
        setHubs(hubsData);
        if (hubsData.length > 0) {
          setSelectedHubId(hubsData[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch hubs:', err);
        setError('Failed to load hub data');
      }
    };
    fetchHubs();
  }, []);

  // Fetch inventory for selected hub
  useEffect(() => {
    if (!selectedHubId) return;

    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await getLogisticsHubInventory(selectedHubId);

        // Transform API response to match expected shape
        const transformed = data.map((item) => ({
          id: item.id.toString(),
          name: item.item_name,
          category: {
            'syrup': 'Syrups',
            'soda': 'Sodas',
            'add-in': 'Add-ins',
            'physical': 'Physical',
          }[item.category] || item.category,
          currentLevelPct: item.current_level_pct || 0,
          avgDailyUsage: item.avg_daily_usage || 0,
          daysRemaining: item.days_remaining || 0,
          trendDirection: item.trend_direction || 'flat',
          trendPct: item.trend_pct || 0,
          status: item.status || 'in_stock',
          quantity: item.quantity,
          threshold: item.threshold,
        }));

        setInventoryItems(transformed);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError('Failed to load inventory data');
        setInventoryItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [selectedHubId]);

  // Filter inventory items
  const filteredItems = useMemo(() => {
    let result = inventoryItems;

    if (search) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter((item) => item.category === filterCategory);
    }

    if (filterLevel !== 'all') {
      result = result.filter((item) => item.status === filterLevel);
    }

    return result;
  }, [search, filterCategory, filterLevel]);

  // Check if any filter is active
  const hasActiveFilter =
    search !== '' || filterCategory !== 'all' || filterLevel !== 'all';

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'critical':
        return { color: '#EF4444', bgColor: '#FEE2E2', label: 'Critical' };
      case 'low':
        return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Low' };
      case 'in_stock':
        return { color: '#10B981', bgColor: '#DCFCE7', label: 'In Stock' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', label: 'Unknown' };
    }
  };

  // Get level percentage color
  const getLevelColor = (pct) => {
    if (pct < 20) return '#EF4444';
    if (pct < 50) return '#F59E0B';
    return '#10B981';
  };

  // Data table columns for supply levels
  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'currentLevelPct',
      label: 'Current Level (%)',
      sortable: true,
      render: (value, row) => (
        <div className={styles.cellProgress}>
          <span>{value}%</span>
          <div className={styles.cellProgressBar}>
            <div
              className={styles.cellProgressBarInner}
              style={{
                width: `${value}%`,
                backgroundColor: getLevelColor(value),
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'avgDailyUsage',
      label: 'Avg Daily Usage',
      sortable: true,
      render: (value) => `${value.toFixed(1)} units`,
    },
    {
      key: 'daysRemaining',
      label: 'Days Remaining',
      sortable: true,
      render: (value) => `${value} days`,
    },
    {
      key: 'trendDirection',
      label: 'Trend',
      sortable: false,
      render: (value, row) => {
        let arrow = '→';
        let color = '#6B7280';
        if (value === 'up') {
          arrow = '↑';
          color = '#10B981';
        } else if (value === 'down') {
          arrow = '↓';
          color = '#EF4444';
        }
        return (
          <span style={{ color }}>
            {arrow} {Math.abs(row.trendPct)}%
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => {
        const badge = getStatusBadge(value);
        return (
          <span
            className={styles.statusPill}
            style={{
              backgroundColor: badge.bgColor,
              color: badge.color,
            }}
          >
            {badge.label}
          </span>
        );
      },
    },
  ];

  // Chart palette colors for consistency
  const chartColors = ['#FF2E63', '#08D9D6', '#F59E0B', '#10B981', '#8B5CF6'];

  if (error) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Inventory</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hub Selector */}
      {hubs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="hubSelect" style={{ marginRight: '10px', fontWeight: '600' }}>
            Select Hub:
          </label>
          <select
            id="hubSelect"
            value={selectedHubId || ''}
            onChange={(e) => setSelectedHubId(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          >
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Inventory</h1>
        <div className={styles.timeRangeGroup}>
          <button
            className={`${styles.timeBtn} ${timeRange === 'week' ? styles.active : ''}`}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </button>
          <button
            className={`${styles.timeBtn} ${timeRange === 'month' ? styles.active : ''}`}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </button>
          <button
            className={`${styles.timeBtn} ${timeRange === '30days' ? styles.active : ''}`}
            onClick={() => setTimeRange('30days')}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {loading && <p>Loading inventory...</p>}

      {/* Tab Bar */}
      {!loading && (
        <>
          <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'supply' ? styles.active : ''}`}
          onClick={() => setActiveTab('supply')}
        >
          Supply Levels
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.active : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Usage Trends
          </button>
        </div>

        {/* Supply Levels Tab */}
        {activeTab === 'supply' && (
          <div>
          {/* Filter Toolbar */}
          <div className={styles.filterToolbar}>
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.filterInput}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              <option value="Syrups">Syrups</option>
              <option value="Sodas">Sodas</option>
              <option value="Add-ins">Add-ins</option>
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="low">Low</option>
              <option value="in_stock">In Stock</option>
            </select>
            {hasActiveFilter && (
              <button
                className={styles.clearFiltersBtn}
                onClick={() => {
                  setSearch('');
                  setFilterCategory('all');
                  setFilterLevel('all');
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Data Table */}
          {filteredItems.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredItems}
              searchable={false}
              rowsPerPage={25}
            />
          ) : (
            <div className={styles.emptyState}>
              No inventory items match your filters.
            </div>
          )}
          </div>
        )}

        {/* Usage Trends Tab */}
        {activeTab === 'trends' && (
          <div>
          {/* AI Badge */}
          <div className={styles.aiBadgeWrapper}>
            <span className={styles.aiBadge}>AI Generated</span>
          </div>

          {/* Two-Column Chart Row */}
          <div className={styles.twoColCharts}>
            {/* Top Trending Ingredients */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Top Trending Ingredients</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={TOP_TRENDING_DATA}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 200, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="ingredient"
                    type="category"
                    width={190}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="thisPeriod" fill="#FF2E63" name="This Period" />
                  <Bar dataKey="prevPeriod" fill="#08D9D6" name="Previous Period" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Variation */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Regional Variation</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={REGIONAL_VARIATION_DATA}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cherry" fill={chartColors[0]} name="Cherry" />
                  <Bar dataKey="mango" fill={chartColors[1]} name="Mango" />
                  <Bar dataKey="vanilla" fill={chartColors[2]} name="Vanilla" />
                  <Bar dataKey="lime" fill={chartColors[3]} name="Lime" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full-Width Chart Row */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Seasonal Patterns</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={SEASONAL_PATTERNS_DATA}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={300} stroke="#D1D5DB" strokeDasharray="5 5" />
                <ReferenceLine y={250} stroke="#D1D5DB" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="cherry"
                  stroke={chartColors[0]}
                  name="Cherry"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="mango"
                  stroke={chartColors[1]}
                  name="Mango"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cola"
                  stroke={chartColors[3]}
                  name="Cola"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insights Card */}
          <div className={styles.insightsCard}>
            <div className={styles.insightsHeader}>
              <h3 className={styles.insightsTitle}>AI Insights</h3>
              <span className={styles.aiBadge}>AI Generated</span>
            </div>
            <ul className={styles.insightsList}>
              {AI_INSIGHTS.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
            <div className={styles.insightsFooter}>
              Report generated with ML models; forecast accuracy 87%
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
