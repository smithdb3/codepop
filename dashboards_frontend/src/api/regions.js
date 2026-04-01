import { apiFetch } from './client';

export const getRegions = () => apiFetch('/backend/api/regions/');

export const getRegionalStatus = () => apiFetch('/backend/api/admin/regional-status/');
