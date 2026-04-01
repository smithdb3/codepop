import { apiFetch } from './client.js';

/**
 * Fetch all deliveries, optionally filtered.
 * @param {Object} filters  e.g. { status: 'in_transit', hub: 1 }
 */
export async function getLogisticsDeliveries(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const query = params ? '?' + params : '';
  return apiFetch(`/backend/api/logistics/deliveries/${query}`);
}

/**
 * Create a new delivery (called from Route Builder "Accept & Schedule").
 * @param {Object} data  { hub, driver_id, store_ids, route, eta, delivery_date, notes }
 */
export async function createDelivery(data) {
  return apiFetch('/backend/api/logistics/deliveries/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Update a delivery's status (e.g. scheduled → in_transit → delivered).
 * @param {number} id
 * @param {string} newStatus
 * @param {string} notes
 */
export async function updateDeliveryStatus(id, newStatus, notes = '') {
  return apiFetch(`/backend/api/logistics/deliveries/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, notes }),
  });
}

/**
 * Fetch KPI count of deliveries in transit for the Overview card.
 */
export async function getDeliveriesKPI() {
  return apiFetch('/backend/api/logistics/deliveries/kpi/');
}

/**
 * Fetch list of available drivers.
 */
export async function getDrivers() {
  return apiFetch('/backend/api/logistics/drivers/');
}
