import { apiFetch } from './client.js';

export async function getInventory() {
  return apiFetch('/backend/inventory/');
}

export async function getInventoryReport() {
  return apiFetch('/backend/inventory/report/');
}

export async function resetInventory(itemId) {
  return apiFetch(`/backend/inventory/${itemId}/reset/`, {
    method: 'PATCH',
  });
}

// Manager: inventory for the logged-in manager's store
export async function getManagerInventory(category = null) {
  const params = category ? `?category=${category}` : '';
  return apiFetch(`/backend/api/manager/inventory/${params}`);
}

// Logistics: hub inventory list
export async function getLogisticsHubInventory(hubId, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiFetch(`/backend/api/logistics/hubs/${hubId}/inventory/${params ? '?' + params : ''}`);
}

// Logistics: store inventory detail tab
export async function getLogisticsStoreInventory(storeId, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiFetch(`/backend/api/logistics/stores/${storeId}/inventory/${params ? '?' + params : ''}`);
}
