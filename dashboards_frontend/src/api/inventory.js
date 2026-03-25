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
