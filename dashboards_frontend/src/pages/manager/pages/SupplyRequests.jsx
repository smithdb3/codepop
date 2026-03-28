import React, { useState } from 'react';
import { MANAGER, SUPPLY_REQUESTS } from '../mockData';
import styles from './SupplyRequests.module.css';

export function SupplyRequests() {
  const [pendingPage, setPendingPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySortAsc, setHistorySortAsc] = useState(false);
  const [quantities, setQuantities] = useState({});

  const rowsPerPage = 25;

  // Pending requests pagination
  const pendingPages = Math.ceil(SUPPLY_REQUESTS.pending.length / rowsPerPage);
  const pendingStart = pendingPage * rowsPerPage;
  const pendingEnd = pendingStart + rowsPerPage;
  const pendingRows = SUPPLY_REQUESTS.pending.slice(pendingStart, pendingEnd);

  // History with filter and sort
  const filteredHistory = SUPPLY_REQUESTS.history.filter((h) => {
    if (historyFilter === 'all') return true;
    return h.status.toLowerCase() === historyFilter.toLowerCase();
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return historySortAsc ? dateA - dateB : dateB - dateA;
  });

  const historyPages = Math.ceil(sortedHistory.length / rowsPerPage);
  const historyStart = historyPage * rowsPerPage;
  const historyEnd = historyStart + rowsPerPage;
  const historyRows = sortedHistory.slice(historyStart, historyEnd);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#3B82F6';
      case 'in_transit':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      in_transit: 'In Transit',
      delivered: 'Delivered',
    };
    return labels[status] || status;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Supply Requests</h1>

      <div className={styles.twoColumn}>
        {/* Left Column - Request Form */}
        <div className={styles.formSection}>
          <h2 className={styles.formTitle}>New Supply Request</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Store Location</label>
            <div className={styles.readOnlyField}>
              {MANAGER.storeName}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>AI-Suggested Items</label>
            <div className={styles.suggestedItems}>
              <div className={styles.suggestedItem}>
                <span className={styles.itemName}>Cherry Syrup</span>
                <div className={styles.qtyInput}>
                  <input
                    type="number"
                    min="0"
                    placeholder="8"
                    value={quantities.cherry || ''}
                    onChange={(e) => setQuantities({ ...quantities, cherry: e.target.value })}
                  />
                  <span className={styles.unit}>cases</span>
                </div>
              </div>
              <div className={styles.suggestedItem}>
                <span className={styles.itemName}>Lime Soda</span>
                <div className={styles.qtyInput}>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    value={quantities.lime || ''}
                    onChange={(e) => setQuantities({ ...quantities, lime: e.target.value })}
                  />
                  <span className={styles.unit}>cases</span>
                </div>
              </div>
              <div className={styles.suggestedItem}>
                <span className={styles.itemName}>Vanilla Soda</span>
                <div className={styles.qtyInput}>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={quantities.vanilla || ''}
                    onChange={(e) => setQuantities({ ...quantities, vanilla: e.target.value })}
                  />
                  <span className={styles.unit}>cases</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button className={styles.primaryBtn}>Request from Supply Hub</button>
            <button className={styles.secondaryBtn}>Request from Nearby Store</button>
          </div>

          <button className={styles.submitBtn}>Submit Request</button>
        </div>

        {/* Right Column - Tables */}
        <div className={styles.tablesSection}>
          {/* Pending Requests Table */}
          <div className={styles.tableCard}>
            <h2 className={styles.tableTitle}>Pending Requests</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th>ID</th>
                    <th>Items</th>
                    <th>Qty</th>
                    <th>Submitted</th>
                    <th>ETA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((req) => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{req.items}</td>
                      <td>{req.qty}</td>
                      <td>{req.submitted}</td>
                      <td>{req.eta}</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(req.status) }}
                        >
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setPendingPage(Math.max(0, pendingPage - 1))}
                  disabled={pendingPage === 0}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {pendingPage + 1} of {pendingPages}
                </span>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setPendingPage(Math.min(pendingPages - 1, pendingPage + 1))}
                  disabled={pendingPage === pendingPages - 1}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Supply Movement History Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2 className={styles.tableTitle}>Supply Movement History</h2>
              <div className={styles.filterBar}>
                <select
                  value={historyFilter}
                  onChange={(e) => {
                    setHistoryFilter(e.target.value);
                    setHistoryPage(0);
                  }}
                  className={styles.filterSelect}
                >
                  <option value="all">All</option>
                  <option value="delivered">Delivered</option>
                  <option value="in_transit">In Transit</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th onClick={() => setHistorySortAsc(!historySortAsc)} className={styles.sortable}>
                      Date {historySortAsc ? '↑' : '↓'}
                    </th>
                    <th>Item(s)</th>
                    <th>Qty</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((item, idx) => (
                    <tr key={`${item.date}-${idx}`}>
                      <td>{item.date}</td>
                      <td>{item.items}</td>
                      <td>{item.qty}</td>
                      <td>{item.source}</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(item.status) }}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
                  disabled={historyPage === 0}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {historyPage + 1} of {historyPages}
                </span>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setHistoryPage(Math.min(historyPages - 1, historyPage + 1))}
                  disabled={historyPage === historyPages - 1}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
