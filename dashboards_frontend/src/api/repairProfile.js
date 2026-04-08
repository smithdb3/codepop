import { apiFetch } from './client.js';

// Get the authenticated user's repair staff profile
export async function getRepairProfile() {
  return apiFetch('/backend/repair-profile/', { method: 'GET' });
}
