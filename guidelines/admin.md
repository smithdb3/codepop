**(M) Admin Dashboard**

User Management
* (M) User Accounts (Searchable/Filterable)
  * Three tabs: Active, Disabled, Deleted
  * Per user displayed:
    * Name, email, assigned location/region
    * Role (Manager, Staff, etc.)
    * Last login timestamp
    * Account status
  * (M) Quick Actions:
    * Active accounts: [Edit] [Disable] [Make Manager] [Delete]
    * Disabled accounts: [Edit] [Enable] [Delete]
    * Deleted accounts: View only (non-recoverable log)
  * (M) Bulk actions: [Disable All] [Reset Passwords] [Export List]
  * (M) Create New User: [+ Add User] button opens form
---
Manager Accounts
* (M) Managers List (Searchable/Filterable)
  * Per manager displayed:
    * Name, email, assigned region(s)/store(s)
    * Last login timestamp
    * Reports to: (Super Admin or other manager)
    * Active user count under this manager
  * (M) Quick Actions: [Edit] [View Reports] [Reset Password] [Disable]
  * (M) Create New Manager: [+ Promote to Manager] (select user from active accounts)
---
Role & Permission Management
* (M) Roles Overview
  * List of all roles: Super Admin, Admin, Manager, Staff, Repair Staff
  * Per role: Permission count, active user count, edit/delete options
  * (M) Edit Role: Opens permissions editor showing checklist of capabilities
  * (C) Create New Role: [+ Custom Role] button
---
System Audit Trail
* (S) Recent Admin Actions
  * Log of: Who, What action, When, Status (Success/Failed)
  * Filter by: Action type, user, date range
  * (C) Export audit log