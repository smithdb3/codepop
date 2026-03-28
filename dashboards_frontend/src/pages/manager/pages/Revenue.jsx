import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '../../super-admin/components/KPICard';
import { KPI_REVENUE, REVENUE_CHART_DATA, REVENUE_TABLE_DATA } from '../mockData';
import styles from './Revenue.module.css';

export function Revenue() {
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 25;
  const totalPages = Math.ceil(REVENUE_TABLE_DATA.length / rowsPerPage);

  const startIndex = currentPage * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const pageData = REVENUE_TABLE_DATA.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Revenue Dashboard</h1>

      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <KPICard
          label={KPI_REVENUE.totalRevenue.label}
          value={KPI_REVENUE.totalRevenue.value}
          delta={KPI_REVENUE.totalRevenue.delta}
          deltaPositive={KPI_REVENUE.totalRevenue.deltaPositive}
          unit={KPI_REVENUE.totalRevenue.unit}
        />
        <KPICard
          label={KPI_REVENUE.inventoryCosts.label}
          value={KPI_REVENUE.inventoryCosts.value}
          delta={KPI_REVENUE.inventoryCosts.delta}
          deltaPositive={KPI_REVENUE.inventoryCosts.deltaPositive}
          unit={KPI_REVENUE.inventoryCosts.unit}
        />
        <KPICard
          label={KPI_REVENUE.totalUsers.label}
          value={KPI_REVENUE.totalUsers.value}
          delta={KPI_REVENUE.totalUsers.delta}
          deltaPositive={KPI_REVENUE.totalUsers.deltaPositive}
          unit={KPI_REVENUE.totalUsers.unit}
        />
        <KPICard
          label={KPI_REVENUE.activeOrders.label}
          value={KPI_REVENUE.activeOrders.value}
          delta={KPI_REVENUE.activeOrders.delta}
          deltaPositive={KPI_REVENUE.activeOrders.deltaPositive}
          unit={KPI_REVENUE.activeOrders.unit}
        />
      </div>

      {/* Revenue Chart */}
      <div className={styles.chartCard}>
        <h2 className={styles.chartTitle}>30-Day Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={REVENUE_CHART_DATA} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis dataKey="date" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#FF2E63" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Table */}
      <div className={styles.tableCard}>
        <h2 className={styles.tableTitle}>Revenue by Category</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Items</th>
                <th>Revenue</th>
                <th>vs. Last Period</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  <td>{row.date}</td>
                  <td>{row.category}</td>
                  <td>{row.items}</td>
                  <td>{row.revenue}</td>
                  <td>
                    <span
                      className={styles.deltaCell}
                      style={{ color: row.vsPeriod.startsWith('+') ? '#10B981' : '#EF4444' }}
                    >
                      {row.vsPeriod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
