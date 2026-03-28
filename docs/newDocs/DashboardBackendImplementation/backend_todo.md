# Backend Implementation TODO - Admin Dashboard

This document lists all UI features in the Admin Dashboard that require backend support. Features are organized by section and marked with implementation priority.

---

## Admin Dashboard - KPI Cards

- [ ] **Aggregate KPI data endpoint** (`GET /backend/admin/kpis/`)
  - Returns: totalUsers (count), activeUsers (count), disabledAccounts (count), totalManagers (count), customRoles (count), recentAuditEvents (count)
  - Each with trend percentage and target values

---

## User Management

### Data & Display
- [ ] **Get all users endpoint** (existing: `GET /backend/users/`)
  - Extend to include: location/region, status field (active/disabled/deleted), lastLogin timestamp
  - Support filtering by status

### Bulk Actions
- [ ] **Bulk disable users endpoint** (`POST /backend/users/bulk-disable/`)
  - Input: array of user IDs
  - Returns: success count, failed count

- [ ] **Bulk reset passwords endpoint** (`POST /backend/users/bulk-reset-password/`)
  - Input: array of user IDs
  - Returns: array of new temporary passwords or confirmation

- [ ] **Bulk export users endpoint** (`POST /backend/users/bulk-export/`)
  - Input: array of user IDs or filter criteria
  - Returns: CSV file stream

### User Actions
- [ ] **Disable user endpoint** (existing: `POST /backend/users/edit/<user_id>/` may support this)
  - Set `is_active = False` for the user

- [ ] **Enable user endpoint** (`POST /backend/users/<user_id>/enable/`)
  - Set `is_active = True` for the user

- [ ] **Promote user to manager endpoint** (`POST /backend/users/<user_id>/promote-to-manager/`)
  - Input: user_id, region(s), store(s)
  - Creates ManagerProfile or equivalent role assignment

- [ ] **Delete user endpoint** (existing: `DELETE /backend/users/delete/<user_id>/`)
  - May need soft-delete logic to preserve audit trail

### Add User Modal
- [ ] **Create user endpoint** (existing: `POST /backend/auth/register/` may handle this)
  - Input: name, email, role, region, password
  - Ensure password hashing and role assignment

---

## Manager Accounts

### Data & Display
- [ ] **Get managers endpoint** (`GET /backend/admin/managers/`)
  - Returns: manager details with regions/stores, reportsTo, activeUsersUnder (subordinate count), lastLogin
  - Support filtering by region/store

### Manager Actions
- [ ] **Edit manager endpoint** (`POST /backend/managers/<manager_id>/edit/`)
  - Update: regions, stores, reportsTo

- [ ] **View manager reports endpoint** (`GET /backend/managers/<manager_id>/reports/`)
  - Returns: list of users under this manager

- [ ] **Reset manager password endpoint** (`POST /backend/managers/<manager_id>/reset-password/`)
  - Generates temporary password

- [ ] **Disable manager endpoint** (`POST /backend/managers/<manager_id>/disable/`)
  - Sets active = False; reassign subordinates if needed

### Promote to Manager Modal
- [ ] **Search active users endpoint** (can use `GET /backend/users/` with status=active filter)
- [ ] **Promote user to manager endpoint** (listed above under User Management)

---

## Role & Permission Management

### Roles Data
- [ ] **Get all roles endpoint** (`GET /backend/admin/roles/`)
  - Returns: role name, permission count, active user count (how many users have this role), isBuiltIn flag

- [ ] **Get role details endpoint** (`GET /backend/admin/roles/<role_id>/`)
  - Returns: role name, full permission list, user assignments

### Role Actions
- [ ] **Create custom role endpoint** (`POST /backend/admin/roles/`)
  - Input: role name, permission IDs array
  - Returns: new role ID

- [ ] **Edit role endpoint** (`POST /backend/admin/roles/<role_id>/edit/`)
  - Input: role name (optional), permission IDs array
  - Prevent editing built-in roles

- [ ] **Delete custom role endpoint** (`DELETE /backend/admin/roles/<role_id>/`)
  - Only allow if no users assigned
  - Prevent deletion of built-in roles

### Permissions
- [ ] **Get all permissions endpoint** (`GET /backend/admin/permissions/`)
  - Returns: permission ID, label, category (User Management / Roles & Permissions / System & Audit)

- [ ] **Assign permission to role endpoint** (`POST /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
  - Add permission to role

- [ ] **Revoke permission from role endpoint** (`DELETE /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
  - Remove permission from role

---

## System Audit Trail

### Data & Display
- [ ] **User action audit log model** (new: `UserAuditLog` or `AdminAuditLog`)
  - Fields: timestamp, actor (user), actorRole, action (string), target (resource name/ID), status (success/failed), details (optional)
  - Separate from existing `SyncAuditLog` (inter-node syncs)

- [ ] **Get audit logs endpoint** (`GET /backend/admin/audit-logs/`)
  - Returns: paginated list of audit entries (50 per page default)
  - Support filtering by: date range, action type, actor
  - Support sorting by: timestamp

### Audit Trail Actions
- [ ] **Export audit logs to CSV endpoint** (`POST /backend/admin/audit-logs/export/`)
  - Input: date range, filter criteria
  - Returns: CSV file stream

### Logging Hooks
- [ ] **Log user creation** when `/backend/auth/register/` is called
- [ ] **Log user edits** when `/backend/users/edit/<user_id>/` is called
- [ ] **Log user deletion** when `/backend/users/delete/<user_id>/` is called
- [ ] **Log user enable/disable** for new endpoints
- [ ] **Log manager promotion** when new endpoint is called
- [ ] **Log role CRUD operations** when new endpoints are called
- [ ] **Log permission assignments** when new endpoints are called
- [ ] **Log password resets** when new endpoints are called
- [ ] **Log failed actions** (e.g., permission denied, invalid user ID) with status=failed

---

## Authentication & Authorization

- [ ] **Verify admin/super_admin role check** on all new endpoints
  - Use existing `ProtectedRoute` with `allowedRoles: ['admin', 'super_admin']`
  - Ensure backend enforces role checks via middleware or decorators

---

## Summary by Priority

**High Priority (MVP):**
1. Extend `GET /backend/users/` to support filters and additional fields
2. Create `GET /backend/admin/kpis/` endpoint
3. Create `UserAuditLog` model and logging hooks
4. Create basic role CRUD endpoints

**Medium Priority:**
5. Bulk actions (disable, reset password, export)
6. Manager-specific endpoints
7. Permission assignment endpoints

**Low Priority (Nice-to-have):**
8. Soft-delete for users
9. Advanced filtering and search optimizations
10. CSV export formatting and caching
