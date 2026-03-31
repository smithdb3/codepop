import React, { useState, useEffect } from 'react';
import { getManagerSupplyRequests, createSupplyRequest, cancelSupplyRequest } from '../../../api/supplyRequests';
import { getManagerInventory } from '../../../api/inventory';
import { MANAGER } from '../mockData';
import styles from './SupplyRequests.module.css';

export function SupplyRequests() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingPage, setPendingPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySortAsc, setHistorySortAsc] = useState(false);

  const [requestItems, setRequestItems] = useState([]);
  const [selectedHub, setSelectedHub] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState('normal');

  const rowsPerPage = 25;

  // Fetch supply requests
  useEffect(() => {
    async function fetchRequests() {
      try {
        setLoading(true);
        const pending = await getManagerSupplyRequests('pending');
        const fulfilled = await getManagerSupplyRequests('fulfilled');
        const denied = await getManagerSupplyRequests('denied');

        setPendingRequests(pending || []);
        setHistoryRequests([...(fulfilled || []), ...(denied || [])]);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch supply requests:', err);
        setError('Failed to load supply requests');
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  // Pending requests pagination
  const pendingPages = Math.ceil(pendingRequests.length / rowsPerPage);
  const pendingStart = pendingPage * rowsPerPage;
  const pendingEnd = pendingStart + rowsPerPage;
  const pendingRows = pendingRequests.slice(pendingStart, pendingEnd);

  // History with filter and sort
  const filteredHistory = historyRequests.filter((h) => {
    if (historyFilter === 'all') return true;
    return h.status === historyFilter;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
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
      case 'fulfilled':
        return '#10B981';
      case 'denied':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      fulfilled: 'Fulfilled',
      denied: 'Denied',
    };
    return labels[status] || status;
  };

  const handleSubmitRequest = async () => {
    if (!selectedHub || requestItems.length === 0) {
      alert('Please select a hub and add items');
      return;
    }

    try {
      const newRequest = await createSupplyRequest({
        hub: selectedHub,
        items: requestItems,
        notes,
        urgency,
      });

      setPendingRequests([newRequest, ...pendingRequests]);
      setSelectedHub('');
      setRequestItems([]);
      setNotes('');
      setUrgency('normal');
      alert('Request submitted successfully!');
    } catch (err) {
      console.error('Failed to create supply request:', err);
      alert('Failed to submit request');
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;

    try {
      await cancelSupplyRequest(id);
      setPendingRequests(pendingRequests.filter(r => r.id !== id));
      alert('Request cancelled');
    } catch (err) {
      console.error('Failed to cancel request:', err);
      alert('Failed to cancel request');
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Supply Requests</h1>

      {error && <div style={{ color: 'red', padding: '10px', marginBottom: '10px' }}>{error}</div>}
      {loading && <div>Loading...</div>}

      {!loading && (
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
              <label className={styles.label}>Supply Hub</label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a hub...</option>
                <option value="1">Regional Hub - North</option>
                <option value="2">Regional Hub - South</option>
                <option value="3">Regional Hub - East</option>
                <option value="4">Regional Hub - West</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Items to Request</label>
              <div className={styles.suggestedItems}>
                {requestItems.map((item, idx) => (
                  <div key={idx} className={styles.suggestedItem}>
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...requestItems];
                        newItems[idx].name = e.target.value;
                        setRequestItems(newItems);
                      }}
                      className={styles.textInput}
                    />
                    <div className={styles.qtyInput}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...requestItems];
                          newItems[idx].qty = parseInt(e.target.value) || 0;
                          setRequestItems(newItems);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => {
                          const newItems = [...requestItems];
                          newItems[idx].unit = e.target.value;
                          setRequestItems(newItems);
                        }}
                        className={styles.unitInput}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => setRequestItems(requestItems.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className={styles.addItemBtn}
                onClick={() => setRequestItems([...requestItems, { name: '', qty: 1, unit: '' }])}
              >
                + Add Item
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className={styles.select}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions..."
                className={styles.textarea}
              />
            </div>

            <button className={styles.submitBtn} onClick={handleSubmitRequest}>Submit Request</button>
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
                      <th>Hub</th>
                      <th>Submitted</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRows.map((req) => (
                      <tr key={req.id}>
                        <td>#{req.id}</td>
                        <td>
                          {req.items.map(i => `${i.name} (${i.qty})`).join(', ')}
                        </td>
                        <td>{req.hub_name || '-'}</td>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td>{req.urgency}</td>
                        <td>
                          <span
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusColor(req.status) }}
                          >
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            Cancel
                          </button>
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
                    <option value="fulfilled">Fulfilled</option>
                    <option value="denied">Denied</option>
                    <option value="approved">Approved</option>
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
                      <th>Hub</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`}>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td>
                          {item.items.map(i => `${i.name} (${i.qty})`).join(', ')}
                        </td>
                        <td>{item.hub_name || '-'}</td>
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
      )}
    </div>
  );
}
