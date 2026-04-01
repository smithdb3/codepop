import { apiFetch } from './client';

// Super Admin endpoints
export const getAdminStores = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`/backend/api/admin/stores/${queryString ? '?' + queryString : ''}`);
};

export const createStore = (data) =>
  apiFetch('/backend/api/admin/stores/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateStore = (id, data) =>
  apiFetch(`/backend/api/admin/stores/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteStore = (id) =>
  apiFetch(`/backend/api/admin/stores/${id}/`, {
    method: 'DELETE',
  });

// Logistics Manager endpoints
export const getLogisticsStores = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`/backend/api/logistics/stores/${queryString ? '?' + queryString : ''}`);
};

export const getCriticalStores = () =>
  apiFetch('/backend/api/logistics/stores/critical/');

export const getStoreDetail = (id) =>
  apiFetch(`/backend/api/logistics/stores/${id}/`);
