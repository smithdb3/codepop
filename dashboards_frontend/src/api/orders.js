import { apiFetch } from './client.js';

export async function getOrders() {
  return apiFetch('/backend/orders/');
}
