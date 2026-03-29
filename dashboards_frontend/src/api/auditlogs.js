import { apiFetch } from './client.js'

export async function getAuditLogs(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const url = queryString ? `/api/admin/audit-logs/?${queryString}` : '/api/admin/audit-logs/'
  return apiFetch(url)
}
