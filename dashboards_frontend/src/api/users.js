import { apiFetch } from './client.js';

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
