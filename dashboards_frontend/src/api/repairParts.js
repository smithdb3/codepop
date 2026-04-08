import { apiFetch } from './client.js';

// Get all repair parts
export async function getRepairParts() {
  return apiFetch('/backend/repair-parts/', { method: 'GET' });
}

// Get a specific repair part
export async function getRepairPart(partId) {
  return apiFetch(`/backend/repair-parts/${partId}/`, { method: 'GET' });
}

// Create a new repair part (admin only)
export async function createRepairPart(partData) {
  return apiFetch('/backend/repair-parts/', {
    method: 'POST',
    body: JSON.stringify(partData),
  });
}

// Update a repair part (admin only)
export async function updateRepairPart(partId, partData) {
  return apiFetch(`/backend/repair-parts/${partId}/`, {
    method: 'PUT',
    body: JSON.stringify(partData),
  });
}

// Get all part orders
export async function getPartOrders() {
  return apiFetch('/backend/part-orders/', { method: 'GET' });
}

// Get a specific part order
export async function getPartOrder(orderId) {
  return apiFetch(`/backend/part-orders/${orderId}/`, { method: 'GET' });
}

// Create a new part order
export async function createPartOrder(orderData) {
  return apiFetch('/backend/part-orders/', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

// Update a part order (e.g., change status)
export async function updatePartOrder(orderId, orderData) {
  return apiFetch(`/backend/part-orders/${orderId}/`, {
    method: 'PATCH',
    body: JSON.stringify(orderData),
  });
}
