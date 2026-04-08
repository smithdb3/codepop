import { apiFetch } from './client.js';

// Get user's pending schedules
export async function getSchedules() {
  return apiFetch('/backend/schedules/get_user_schedules/', { method: 'GET' });
}

// Create a new schedule
export async function createSchedule(scheduleData) {
  return apiFetch('/backend/schedules/', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  });
}

// Mark a schedule as complete
export async function setCompletion(scheduleId) {
  return apiFetch(`/backend/schedules/${scheduleId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ completed_at: new Date().toISOString() }),
  });
}
