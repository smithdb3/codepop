import { apiFetch } from './client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Get all machines
export async function getMachines() {
  return apiFetch('/backend/machines/', { method: 'GET' });
}

// Gets a machine using an id
export async function getMachine(machineId) {
  return apiFetch(`/backend/machines/${machineId}/`, { method: 'GET' });
}

export async function getMachinePair(machineId) {
  return apiFetch(`/backend/machines/${machineId}/special-operations/`, { method: 'GET' });
}

export async function createMachine(machineData) {
  return apiFetch('/backend/machines/', {
    method: 'POST',
    body: JSON.stringify(machineData),
  });
}

// Get machine repair logs
export async function getMachineRepairLogs(machineId) {
  return apiFetch(`/backend/machines/${machineId}/repair-logs/`, { method: 'GET' });
}

export async function getMachineDetail(machineId) {
  return apiFetch(`/backend/machines/${machineId}/`, { method: 'GET' });
}

export async function updateMachineStatus(machineId, status) {
  return apiFetch(`/backend/machines/${machineId}/special-operations/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
