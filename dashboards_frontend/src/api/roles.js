import { apiFetch } from './client.js'

export async function getRoles(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const url = queryString ? `/api/admin/roles/?${queryString}` : '/api/admin/roles/'
  return apiFetch(url)
}

export async function createRole(data) {
  return apiFetch('/api/admin/roles/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateRole(id, data) {
  return apiFetch(`/api/admin/roles/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteRole(id) {
  return apiFetch(`/api/admin/roles/${id}/`, {
    method: 'DELETE',
  })
}

export async function getPermissions() {
  return apiFetch('/api/admin/permissions/')
}
