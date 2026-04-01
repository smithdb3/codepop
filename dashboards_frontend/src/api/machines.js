import { apiFetch } from './client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Stub: Phase 5 - endpoint not yet implemented in backend
// Gets a machine using an id
export async function getMachine(machine_id) {
  try {
      const token = localStorage.getItem('cp_token');
      const url = `${BASE_URL}/backend/machines/${machine_id}`;

      const response = await fetch(url, {
          method: 'GET',
          headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
}

export async function createMachine(machineData) {
  try {
      const token = localStorage.getItem('cp_token');
      const url = `${BASE_URL}/backend/machines/`;

      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(machineData),
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
        }
}

export async function getMachineDetail(machineId) {
  console.warn('Machine detail endpoint not yet implemented');
  return null;
}

export async function updateMachineStatus(machineId, status) {
  console.warn('Update machine status endpoint not yet implemented');
  return null;
}
