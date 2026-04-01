import { apiFetch } from './client.js';

const BASE = '/backend/api/repair/machines';

export async function getMachines() {
  return apiFetch(`${BASE}/`);
 }
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
  return apiFetch(`${BASE}/${machineId}/`);
}

export async function updateMachineStatus(machineId, status) {
  return apiFetch(`${BASE}/${machineId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getMachineHistory(machineId) {
  return apiFetch(`${BASE}/${machineId}/history/`);
}

export async function getMachineParts(machineId) {
  return apiFetch(`${BASE}/${machineId}/parts/`);
}

export async function getMachineNotes(machineId) {
  return apiFetch(`${BASE}/${machineId}/notes/`);
}

export async function createMachineNote(machineId, content) {
  return apiFetch(`${BASE}/${machineId}/notes/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function uploadMachinePhoto(machineId, file) {
  // Do NOT use apiFetch here — it hard-codes Content-Type: application/json.
  // Let the browser set the multipart/form-data boundary automatically.
  const token = localStorage.getItem('cp_token');
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${BASE}/${machineId}/photos/`, {
    method: 'POST',
    headers: token ? { Authorization: `Token ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('cp_token');
    window.location.href = '/login';
    return null;
  }
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteMachinePhoto(machineId, photoId) {
  return apiFetch(`${BASE}/${machineId}/photos/${photoId}/`, {
    method: 'DELETE',
  });
}
