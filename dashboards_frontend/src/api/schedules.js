import { apiFetch } from './client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN = localStorage.getItem('cp_token');
// Stub: Phase 5 - endpoint not yet implemented in backend
export async function getSchedules() {
   try {
      const url = `${BASE_URL}/backend/schedules/get_user_schedules/`;

      const response = await fetch(url, {
          method: 'GET',
          headers: {
              'Authorization': `Token ${TOKEN}`,
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

export async function createSchedule(scheduleData) {
    try {
      const url = `${BASE_URL}/backend/schedules/`;
      console.log(TOKEN);
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Token ${TOKEN}`,
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
