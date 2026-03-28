// Mock data for Super Admin Dashboard
// All data is static and for UI demonstration purposes

export const REGIONS = [
  { id: 'chicago', name: 'Chicago', storesOnline: 8, storesTotal: 10, alerts: 2, revenue: 12500, status: 'healthy' },
  { id: 'nj', name: 'New Jersey', storesOnline: 9, storesTotal: 10, alerts: 1, revenue: 15200, status: 'healthy' },
  { id: 'logan', name: 'Logan', storesOnline: 5, storesTotal: 6, alerts: 0, revenue: 8900, status: 'healthy' },
  { id: 'dallas', name: 'Dallas', storesOnline: 10, storesTotal: 10, alerts: 3, revenue: 18700, status: 'degraded' },
  { id: 'phoenix', name: 'Phoenix', storesOnline: 7, storesTotal: 8, alerts: 1, revenue: 11200, status: 'healthy' },
  { id: 'atlanta', name: 'Atlanta', storesOnline: 6, storesTotal: 7, alerts: 2, revenue: 13400, status: 'degraded' },
  { id: 'seattle', name: 'Seattle', storesOnline: 4, storesTotal: 5, alerts: 4, revenue: 9800, status: 'critical' },
];

export const KPI_METRICS = [
  { id: 'orders', label: 'Active Orders', value: 127, trend: 15, target: 120 },
  { id: 'revenue', label: 'Revenue Today', value: '$4,250', trend: 8, target: '$5,000' },
  { id: 'inventory', label: 'Inventory Health', value: '85%', trend: -3, target: '90%' },
  { id: 'uptime', label: 'Machine Uptime', value: '98.5%', trend: 2, target: '99%' },
  { id: 'api', label: 'API Response Time', value: '120ms', trend: -5, target: '<200ms' },
  { id: 'latency', label: 'Network Latency', value: '45ms', trend: 3, target: '<50ms' },
];

export const ALERTS = [
  {
    id: 1,
    severity: 'critical',
    message: 'Dallas Hub: High latency detected',
    details: '500ms response time',
    time: '2 minutes ago',
    region: 'Dallas',
    dismissed: false,
  },
  {
    id: 2,
    severity: 'warning',
    message: 'Logan Store #3: Machine offline',
    details: 'Needs maintenance',
    time: '15 minutes ago',
    region: 'Logan',
    dismissed: false,
  },
  {
    id: 3,
    severity: 'warning',
    message: 'Inventory Alert: Vanilla syrup running low',
    details: '5% stock remaining',
    time: '1 hour ago',
    region: 'Chicago',
    dismissed: false,
  },
  {
    id: 4,
    severity: 'info',
    message: 'Atlanta: 3 new orders received',
    details: 'All assigned to available machines',
    time: '5 minutes ago',
    region: 'Atlanta',
    dismissed: false,
  },
];

export const STORES = [
  { id: 1, name: 'Store #1 - Downtown', region: 'chicago', status: 'online', orders: 23, inventory: 92, revenue: 2300, lastCheck: '2 min ago' },
  { id: 2, name: 'Store #2 - Northside', region: 'chicago', status: 'online', orders: 18, inventory: 78, revenue: 1800, lastCheck: '5 min ago' },
  { id: 3, name: 'Store #3 - River North', region: 'chicago', status: 'offline', orders: 0, inventory: 45, revenue: 0, lastCheck: '45 min ago' },
  { id: 4, name: 'Store #1 - Manhattan', region: 'nj', status: 'online', orders: 31, inventory: 95, revenue: 3100, lastCheck: '1 min ago' },
  { id: 5, name: 'Store #2 - Jersey City', region: 'nj', status: 'online', orders: 24, inventory: 88, revenue: 2400, lastCheck: '3 min ago' },
  { id: 6, name: 'Store #1 - Main St', region: 'logan', status: 'online', orders: 15, inventory: 82, revenue: 1500, lastCheck: '7 min ago' },
  { id: 7, name: 'Store #2 - University', region: 'logan', status: 'online', orders: 12, inventory: 71, revenue: 1200, lastCheck: '10 min ago' },
  { id: 8, name: 'Store #1 - Downtown', region: 'dallas', status: 'online', orders: 28, inventory: 85, revenue: 2800, lastCheck: '4 min ago' },
  { id: 9, name: 'Store #2 - Airport', region: 'dallas', status: 'online', orders: 35, inventory: 91, revenue: 3500, lastCheck: '1 min ago' },
  { id: 10, name: 'Store #1 - Downtown', region: 'phoenix', status: 'online', orders: 20, inventory: 79, revenue: 2000, lastCheck: '6 min ago' },
  { id: 11, name: 'Store #1 - Midtown', region: 'atlanta', status: 'online', orders: 19, inventory: 86, revenue: 1900, lastCheck: '2 min ago' },
  { id: 12, name: 'Store #1 - Pioneer Square', region: 'seattle', status: 'offline', orders: 0, inventory: 34, revenue: 0, lastCheck: '2 hours ago' },
];

export const HUBS = [
  { id: 1, name: 'Hub Alpha', region: 'chicago', status: 'online', stores: 3, inventory: 87, lastUpdated: '5 min ago' },
  { id: 2, name: 'Hub Beta', region: 'nj', status: 'online', stores: 2, inventory: 91, lastUpdated: '3 min ago' },
  { id: 3, name: 'Hub Gamma', region: 'logan', status: 'online', stores: 2, inventory: 76, lastUpdated: '8 min ago' },
  { id: 4, name: 'Hub Delta', region: 'dallas', status: 'online', stores: 3, inventory: 88, lastUpdated: '2 min ago' },
  { id: 5, name: 'Hub Epsilon', region: 'phoenix', status: 'online', stores: 2, inventory: 79, lastUpdated: '7 min ago' },
  { id: 6, name: 'Hub Zeta', region: 'atlanta', status: 'online', stores: 2, inventory: 83, lastUpdated: '4 min ago' },
  { id: 7, name: 'Hub Theta', region: 'seattle', status: 'degraded', stores: 1, inventory: 45, lastUpdated: '2 hours ago' },
];

export const USERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@codepop.com', role: 'super_admin', region: 'All', lastLogin: '1 min ago', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@codepop.com', role: 'admin', region: 'Chicago', lastLogin: '30 min ago', status: 'active' },
  { id: 3, name: 'Carol Davis', email: 'carol@codepop.com', role: 'manager', region: 'Dallas', lastLogin: '2 hours ago', status: 'active' },
  { id: 4, name: 'David Wilson', email: 'david@codepop.com', role: 'repair_staff', region: 'Logan', lastLogin: '1 day ago', status: 'inactive' },
  { id: 5, name: 'Emma Brown', email: 'emma@codepop.com', role: 'logistics_manager', region: 'Atlanta', lastLogin: '5 min ago', status: 'active' },
  { id: 6, name: 'Frank Miller', email: 'frank@codepop.com', role: 'admin', region: 'New Jersey', lastLogin: '45 min ago', status: 'active' },
];

export const ROLES = [
  { id: 1, name: 'Super Admin', permissions: ['view_orders', 'view_inventory', 'create_supply_req', 'approve_supply_req', 'manage_stores', 'view_analytics', 'manage_users', 'manage_roles', 'view_audit_logs', 'system_settings'] },
  { id: 2, name: 'Admin', permissions: ['view_orders', 'view_inventory', 'create_supply_req', 'approve_supply_req', 'manage_stores', 'view_analytics', 'manage_users'] },
  { id: 3, name: 'Logistics Manager', permissions: ['view_orders', 'view_inventory', 'create_supply_req', 'approve_supply_req'] },
  { id: 4, name: 'Repair Staff', permissions: ['view_orders', 'view_inventory'] },
  { id: 5, name: 'Manager', permissions: ['view_orders', 'view_inventory', 'create_supply_req'] },
];

const PERMISSION_LABELS = {
  view_orders: 'View Orders',
  view_inventory: 'View Inventory',
  create_supply_req: 'Create Supply Requests',
  approve_supply_req: 'Approve Supply Requests',
  manage_stores: 'Manage Stores',
  view_analytics: 'View Analytics',
  manage_users: 'Manage Users',
  manage_roles: 'Manage Roles',
  view_audit_logs: 'View Audit Logs',
  system_settings: 'System Settings',
};

export const ALL_PERMISSIONS = Object.entries(PERMISSION_LABELS).map(([id, label]) => ({ id, label }));

export const AUDIT_LOGS = [
  { id: 1, who: 'Alice Johnson', what: 'Created user', when: '2 min ago', where: 'User Management', result: 'success' },
  { id: 2, who: 'Bob Smith', what: 'Changed AI threshold', when: '15 min ago', where: 'AI Configuration', result: 'success' },
  { id: 3, who: 'Carol Davis', what: 'Disabled store', when: '45 min ago', where: 'Store #3, Dallas', result: 'success' },
  { id: 4, who: 'Emma Brown', what: 'Approved supply request', when: '1 hour ago', where: 'Supply Hub Alpha', result: 'success' },
  { id: 5, who: 'Frank Miller', what: 'Reset user password', when: '2 hours ago', where: 'David Wilson', result: 'success' },
  { id: 6, who: 'Alice Johnson', what: 'Updated system settings', when: '3 hours ago', where: 'System Settings', result: 'success' },
];

// Chart data for 24-hour period
export const LATENCY_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  latency: Math.random() * 60 + 30, // 30-90ms
}));

export const ORDER_VOLUME_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  orders: Math.floor(Math.random() * 50 + 50), // 50-100 orders
}));

export const API_TIME_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  responseTime: Math.random() * 100 + 80, // 80-180ms
}));

export const UPTIME_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  uptime: 98 + Math.random() * 1.5, // 98-99.5%
}));

export const REVENUE_CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  revenue: Math.floor(Math.random() * 5000 + 3000), // $3000-8000
}));

export const INVENTORY_CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  percentage: Math.floor(Math.random() * 30 + 65), // 65-95%
}));

export const MACHINE_UPTIME_CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  uptime: 96 + Math.random() * 3.5, // 96-99.5%
}));

export const ORDERS_TREND_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  orders: Math.floor(Math.random() * 100 + 100), // 100-200 orders
}));
