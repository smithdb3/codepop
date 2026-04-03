const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN = localStorage.getItem('cp_token');
// Stub: Phase 5 - endpoint not yet implemented in backend
export async function getStore() {
   try {
      const url = `${BASE_URL}/api/hub/store-registry/`;
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