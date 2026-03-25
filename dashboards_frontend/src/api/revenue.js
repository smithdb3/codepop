import { apiFetch } from './client.js';

export async function getRevenues() {
  return apiFetch('/backend/revenues/');
}

export async function getNationalRevenue() {
  return apiFetch('/backend/revenues/national/');
}
