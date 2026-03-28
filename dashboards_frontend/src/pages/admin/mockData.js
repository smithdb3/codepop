// Mock data for Admin Dashboard

export const ADMIN_KPI = [
  { id: 'totalUsers', label: 'Total Users', value: 247, trend: 12, target: '250' },
  { id: 'activeUsers', label: 'Active Users', value: 189, trend: 8, target: '180' },
  { id: 'disabledAccounts', label: 'Disabled Accounts', value: 23, trend: -5, target: '<20' },
  { id: 'totalManagers', label: 'Total Managers', value: 14, trend: 2, target: '16' },
  { id: 'customRoles', label: 'Custom Roles', value: 3, trend: 1, target: '5' },
  { id: 'auditEvents', label: 'Recent Audit Events', value: 7, trend: 3, target: '10' },
];

export const ADMIN_USERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@codepop.com', location: 'Chicago', role: 'Super Admin', lastLogin: '2 min ago', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@codepop.com', location: 'Dallas', role: 'Admin', lastLogin: '30 min ago', status: 'active' },
  { id: 3, name: 'Carol Davis', email: 'carol@codepop.com', location: 'New Jersey', role: 'Manager', lastLogin: '2 hours ago', status: 'active' },
  { id: 4, name: 'David Wilson', email: 'david@codepop.com', location: 'Logan', role: 'Repair Staff', lastLogin: '1 day ago', status: 'disabled' },
  { id: 5, name: 'Emma Brown', email: 'emma@codepop.com', location: 'Atlanta', role: 'Logistics Manager', lastLogin: '5 min ago', status: 'active' },
  { id: 6, name: 'Frank Miller', email: 'frank@codepop.com', location: 'Phoenix', role: 'Admin', lastLogin: '45 min ago', status: 'active' },
  { id: 7, name: 'Grace Lee', email: 'grace@codepop.com', location: 'Seattle', role: 'Manager', lastLogin: '3 hours ago', status: 'active' },
  { id: 8, name: 'Henry Garcia', email: 'henry@codepop.com', location: 'Chicago', role: 'Staff', lastLogin: '2 days ago', status: 'disabled' },
  { id: 9, name: 'Iris Martinez', email: 'iris@codepop.com', location: 'Dallas', role: 'Manager', lastLogin: '10 min ago', status: 'active' },
  { id: 10, name: 'Jack Thompson', email: 'jack@codepop.com', location: 'Atlanta', role: 'Repair Staff', lastLogin: '1 hour ago', status: 'active' },
  { id: 11, name: 'Kate Johnson', email: 'kate@codepop.com', location: 'New Jersey', role: 'Logistics Manager', lastLogin: '20 min ago', status: 'active' },
  { id: 12, name: 'Leo Zhang', email: 'leo@codepop.com', location: 'Phoenix', role: 'Manager', lastLogin: '5 days ago', status: 'deleted' },
  { id: 13, name: 'Mia Chen', email: 'mia@codepop.com', location: 'Seattle', role: 'Staff', lastLogin: '12 hours ago', status: 'active' },
  { id: 14, name: 'Nathan Brown', email: 'nathan@codepop.com', location: 'Logan', role: 'Admin', lastLogin: '1 week ago', status: 'deleted' },
  { id: 15, name: 'Olivia Taylor', email: 'olivia@codepop.com', location: 'Chicago', role: 'Manager', lastLogin: '35 min ago', status: 'active' },
];

export const ADMIN_MANAGERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@codepop.com', regions: 'All Regions', reportsTo: 'N/A', activeUsersUnder: 247, lastLogin: '2 min ago' },
  { id: 2, name: 'Bob Smith', email: 'bob@codepop.com', regions: 'Chicago, New Jersey', reportsTo: 'Alice Johnson', activeUsersUnder: 45, lastLogin: '30 min ago' },
  { id: 3, name: 'Carol Davis', email: 'carol@codepop.com', regions: 'Dallas', reportsTo: 'Alice Johnson', activeUsersUnder: 38, lastLogin: '2 hours ago' },
  { id: 4, name: 'Emma Brown', email: 'emma@codepop.com', regions: 'Atlanta, Phoenix', reportsTo: 'Bob Smith', activeUsersUnder: 52, lastLogin: '5 min ago' },
  { id: 5, name: 'Frank Miller', email: 'frank@codepop.com', regions: 'Seattle, Logan', reportsTo: 'Alice Johnson', activeUsersUnder: 35, lastLogin: '45 min ago' },
  { id: 6, name: 'Grace Lee', email: 'grace@codepop.com', regions: 'Chicago', reportsTo: 'Bob Smith', activeUsersUnder: 28, lastLogin: '3 hours ago' },
  { id: 7, name: 'Iris Martinez', email: 'iris@codepop.com', regions: 'Dallas', reportsTo: 'Carol Davis', activeUsersUnder: 22, lastLogin: '10 min ago' },
  { id: 8, name: 'Kate Johnson', email: 'kate@codepop.com', regions: 'New Jersey, Atlanta', reportsTo: 'Bob Smith', activeUsersUnder: 41, lastLogin: '20 min ago' },
];

export const ADMIN_ROLES = [
  {
    id: 1,
    name: 'Super Admin',
    permissions: ['view_users', 'manage_users', 'manage_managers', 'manage_roles', 'manage_permissions', 'view_audit_logs', 'export_data', 'system_settings'],
    userCount: 1,
    isBuiltIn: true,
  },
  {
    id: 2,
    name: 'Admin',
    permissions: ['view_users', 'manage_users', 'manage_managers', 'view_audit_logs', 'export_data'],
    userCount: 3,
    isBuiltIn: true,
  },
  {
    id: 3,
    name: 'Manager',
    permissions: ['view_users', 'manage_managers', 'export_data'],
    userCount: 5,
    isBuiltIn: true,
  },
  {
    id: 4,
    name: 'Staff',
    permissions: ['view_users', 'export_data'],
    userCount: 12,
    isBuiltIn: true,
  },
  {
    id: 5,
    name: 'Repair Staff',
    permissions: ['view_users'],
    userCount: 8,
    isBuiltIn: true,
  },
  {
    id: 6,
    name: 'Regional Manager',
    permissions: ['view_users', 'manage_users', 'manage_managers', 'export_data', 'view_audit_logs'],
    userCount: 4,
    isBuiltIn: false,
  },
  {
    id: 7,
    name: 'Content Moderator',
    permissions: ['view_users', 'manage_users'],
    userCount: 2,
    isBuiltIn: false,
  },
  {
    id: 8,
    name: 'Analytics Viewer',
    permissions: ['view_users', 'export_data', 'view_audit_logs'],
    userCount: 3,
    isBuiltIn: false,
  },
];

export const ALL_PERMISSIONS = [
  // User Management
  { id: 'view_users', label: 'View Users', category: 'User Management' },
  { id: 'manage_users', label: 'Create/Edit/Delete Users', category: 'User Management' },
  { id: 'manage_managers', label: 'Promote/Demote Managers', category: 'User Management' },
  { id: 'reset_passwords', label: 'Reset User Passwords', category: 'User Management' },
  // Roles & Permissions
  { id: 'manage_roles', label: 'Create/Edit/Delete Roles', category: 'Roles & Permissions' },
  { id: 'manage_permissions', label: 'Assign Permissions', category: 'Roles & Permissions' },
  // System & Audit
  { id: 'view_audit_logs', label: 'View Audit Logs', category: 'System & Audit' },
  { id: 'export_data', label: 'Export Data', category: 'System & Audit' },
  { id: 'system_settings', label: 'System Settings', category: 'System & Audit' },
];

export const ADMIN_AUDIT = [
  { id: 1, timestamp: '2026-03-28 14:32:15', actor: 'Alice Johnson', actorRole: 'Super Admin', action: 'User Created', target: 'Emma Brown', status: 'success' },
  { id: 2, timestamp: '2026-03-28 14:15:22', actor: 'Bob Smith', actorRole: 'Admin', action: 'User Disabled', target: 'David Wilson', status: 'success' },
  { id: 3, timestamp: '2026-03-28 14:02:11', actor: 'Carol Davis', actorRole: 'Manager', action: 'Password Reset', target: 'Jack Thompson', status: 'success' },
  { id: 4, timestamp: '2026-03-28 13:45:33', actor: 'Alice Johnson', actorRole: 'Super Admin', action: 'Role Created', target: 'Regional Manager', status: 'success' },
  { id: 5, timestamp: '2026-03-28 13:22:19', actor: 'Bob Smith', actorRole: 'Admin', action: 'Permission Assigned', target: 'Regional Manager', status: 'success' },
  { id: 6, timestamp: '2026-03-28 13:08:44', actor: 'Emma Brown', actorRole: 'Logistics Manager', action: 'Audit Log Exported', target: 'User Management', status: 'success' },
  { id: 7, timestamp: '2026-03-28 12:55:12', actor: 'Alice Johnson', actorRole: 'Super Admin', action: 'Manager Promoted', target: 'Frank Miller', status: 'success' },
  { id: 8, timestamp: '2026-03-28 12:42:01', actor: 'Carol Davis', actorRole: 'Manager', action: 'User Enabled', target: 'Henry Garcia', status: 'success' },
  { id: 9, timestamp: '2026-03-28 12:20:33', actor: 'Bob Smith', actorRole: 'Admin', action: 'Role Updated', target: 'Admin', status: 'success' },
  { id: 10, timestamp: '2026-03-28 12:05:22', actor: 'Alice Johnson', actorRole: 'Super Admin', action: 'User Deleted', target: 'Leo Zhang', status: 'success' },
  { id: 11, timestamp: '2026-03-28 11:48:15', actor: 'Emma Brown', actorRole: 'Logistics Manager', action: 'System Settings Updated', target: 'Email Configuration', status: 'failed' },
  { id: 12, timestamp: '2026-03-28 11:35:47', actor: 'Frank Miller', actorRole: 'Admin', action: 'Permission Revoked', target: 'Content Moderator', status: 'success' },
];
