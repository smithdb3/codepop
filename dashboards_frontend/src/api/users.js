import { apiFetch } from './client.js';

// Mobile app endpoints (legacy)
export async function getUsers() {
  return apiFetch('/backend/users/');
}

export async function editUser(userId, updates) {
  return apiFetch(`/backend/users/edit/${userId}/`, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(userId) {
  return apiFetch(`/backend/users/delete/${userId}/`, {
    method: 'DELETE',
  });
}

// Admin dashboard endpoints
export async function getAdminUsers(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const url = queryString ? `/api/admin/users/?${queryString}` : '/api/admin/users/'
  return apiFetch(url)
}

export async function createAdminUser(data) {
  return apiFetch('/api/admin/users/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminUser(id, data) {
  return apiFetch(`/api/admin/users/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAdminUser(id) {
  return apiFetch(`/api/admin/users/${id}/`, {
    method: 'DELETE',
  })
}

export async function disableAdminUser(id) {
  return apiFetch(`/api/admin/users/${id}/disable/`, {
    method: 'POST',
  })
}

export async function enableAdminUser(id) {
  return apiFetch(`/api/admin/users/${id}/enable/`, {
    method: 'POST',
  })
}

export async function getAdminKPI() {
  return apiFetch('/api/admin/kpi/')
}
