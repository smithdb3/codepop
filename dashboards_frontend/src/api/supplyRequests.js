import { apiFetch } from './client.js';

export async function getLogisticsSupplyRequests(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const query = params ? '?' + params : '';
  return apiFetch(`/backend/api/logistics/supply-requests/${query}`);
}

export async function updateSupplyRequestStatus(id, status, notes = '') {
  return apiFetch(`/backend/api/logistics/supply-requests/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
}

export async function getManagerSupplyRequests(status) {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/backend/api/manager/supply-requests/${params}`);
}

export async function createSupplyRequest(data) {
  return apiFetch('/backend/api/manager/supply-requests/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function cancelSupplyRequest(id) {
  return apiFetch(`/backend/api/manager/supply-requests/${id}/`, { method: 'DELETE' });
}
