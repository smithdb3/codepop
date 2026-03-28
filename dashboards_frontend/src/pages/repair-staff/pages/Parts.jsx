import React, { useState, useMemo } from 'react';
import { DataTable } from '../../super-admin/components/DataTable';
import { PARTS, OPEN_ORDERS } from '../mockData';
import styles from './Parts.module.css';

export function Parts({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(OPEN_ORDERS);

  // Filter parts by search
  const filteredParts = useMemo(() => {
    if (!search) return PARTS;
    const term = search.toLowerCase();
    return PARTS.filter(
      (p) =>
        p.partName.toLowerCase().includes(term) ||
        p.partNumber.toLowerCase().includes(term) ||
        p.machineId.toLowerCase().includes(term)
    );
  }, [search]);

  // Handle Mark Received
  const handleMarkReceived = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' } : o))
    );
  };

  // Table columns for parts
  const partsColumns = [
    {
      key: 'partName',
      label: 'Part Name / Number',
      sortable: true,
      render: (_, row) => (
        <>
          <strong>{row.partName}</strong>
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.partNumber}
          </span>
        </>
      ),
    },
    {
      key: 'machineModel',
      label: 'Machine / Model',
      sortable: true,
      render: (_, row) => (
        <>
          {row.machineId}
          <br />
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.machineModel}
          </span>
        </>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      sortable: true,
      render: (val) => <StockBadge status={val} />,
    },
    {
      key: 'qtyAvailable',
      label: 'Qty',
      sortable: true,
    },
    {
      key: 'hubLocation',
      label: 'Hub Location',
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button
          className={styles.requestBtn}
          onClick={() => console.log('Request part:', row.partNumber)}
        >
          Request
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Parts & Inventory</h1>
      </div>

      {/* Two-Column Layout */}
      <div className={styles.twoCol}>
        {/* Left: Parts Availability Table */}
        <div className={styles.partsTableCard}>
          <div className={styles.tableHeader}>
            <input
              type="text"
              placeholder="Search by machine ID, part name, part number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <DataTable
            columns={partsColumns}
            data={filteredParts}
            searchable={false}
            rowsPerPage={25}
          />
          {filteredParts.length === 0 && search && (
            <div className={styles.emptyState}>
              No parts found matching "{search}"
            </div>
          )}
        </div>

        {/* Right: Open Orders Tracker */}
        <div className={styles.ordersCard}>
          <h3 className={styles.cardTitle}>Open Orders</h3>
          <div className={styles.ordersContent}>
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div>
                      <div className={styles.orderPartName}>
                        {order.partName}
                      </div>
                      <div className={styles.orderRequestDate}>
                        Requested: {order.requestedDate}
                      </div>
                    </div>
                  </div>
                  <div className={styles.orderStatus}>
                    <StockBadge status={order.status} />
                  </div>
                  <div className={styles.orderEta}>
                    Expected: {order.eta}
                  </div>
                  <button
                    className={styles.markReceivedBtn}
                    onClick={() => handleMarkReceived(order.id)}
                    disabled={order.status === 'delivered'}
                  >
                    {order.status === 'delivered' ? 'Received' : 'Mark Received'}
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                No pending orders — all parts in stock.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockBadge({ status }) {
  const config = {
    in_stock: { bg: '#DCFCE7', text: '#16A34A', label: 'In Stock' },
    order_pending: {
      bg: '#FEF3C7',
      text: '#D97706',
      label: 'Order Pending',
    },
    back_order: { bg: '#FEE2E2', text: '#DC2626', label: 'Back-order' },
    in_transit: { bg: '#DBEAFE', text: '#0369A1', label: 'In Transit' },
    delivered: { bg: '#DCFCE7', text: '#16A34A', label: 'Delivered' },
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
  };

  const badge_config = config[status] || config.in_stock;

  return (
    <span
      style={{
        background: badge_config.bg,
        color: badge_config.text,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {badge_config.label}
    </span>
  );
}
