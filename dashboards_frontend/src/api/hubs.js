import { apiFetch } from './client';

// Super Admin endpoints
export const getAdminHubs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`/backend/api/admin/hubs/${queryString ? '?' + queryString : ''}`);
};

export const createHub = (data) =>
  apiFetch('/backend/api/admin/hubs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateHub = (id, data) =>
  apiFetch(`/backend/api/admin/hubs/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteHub = (id) =>
  apiFetch(`/backend/api/admin/hubs/${id}/`, {
    method: 'DELETE',
  });

// Logistics Manager endpoints
export const getLogisticsHubStatus = () =>
  apiFetch('/backend/api/logistics/hub-status/');
