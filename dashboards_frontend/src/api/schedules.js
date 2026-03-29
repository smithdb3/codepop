import { apiFetch } from './client.js';

// Stub: Phase 5 - endpoint not yet implemented in backend
export async function getSchedules() {
  console.warn('Schedules endpoint not yet implemented');
  return [];
}

export async function createSchedule(scheduleData) {
    try {
      const token = localStorage.getItem('cp_token');
      const url = `${BASE_URL}/backend/schedules/`;


      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(scheduleData),
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

export async function updateSchedule(scheduleId, updates) {
  console.warn('Update schedule endpoint not yet implemented');
  return null;
}
