import { apiFetch } from './client.js';

export async function login(email, password) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ''}/backend/auth/login/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    }
  );

  if (!res.ok) {
    throw new Error('Login failed');
  }

  const data = await res.json();

  localStorage.setItem('cp_token', data.token);
  localStorage.setItem('cp_role', data.userRole);
  localStorage.setItem('cp_user_id', data.user_id);
  localStorage.setItem('cp_first_name', data.first_name);

  return data;
}

export function logout() {
  localStorage.removeItem('cp_token');
  localStorage.removeItem('cp_role');
  localStorage.removeItem('cp_user_id');
  localStorage.removeItem('cp_first_name');
}

export function getStoredAuth() {
  return {
    token: localStorage.getItem('cp_token'),
    role: localStorage.getItem('cp_role'),
    userId: localStorage.getItem('cp_user_id'),
    firstName: localStorage.getItem('cp_first_name'),
  };
}
