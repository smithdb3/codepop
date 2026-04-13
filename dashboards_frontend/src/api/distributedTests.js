import { apiFetch } from './client';

/**
 * Get list of available distributed system tests
 */
export async function getDistributedTests() {
  return apiFetch('/backend/api/admin/distributed-tests/');
}

/**
 * Run a specific distributed system test
 * @param {string} testId - Test ID (e.g. "health", "registry", or "all")
 */
export async function runDistributedTest(testId) {
  return apiFetch('/backend/api/admin/distributed-tests/run/', {
    method: 'POST',
    body: JSON.stringify({ test_id: testId }),
  });
}
