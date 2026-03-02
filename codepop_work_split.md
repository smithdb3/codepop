# CodePop Sprint Work Split Plan

## Context
The team is entering the development sprint for CodePop. Work assignments are clear and granular enough for each team member to work independently. This plan defines the work split: Braden (architecture + databases), Jordan (API integration + chatbot), Barrett (user UI/UX), Nathan (logistics + repair staff + CSV upload), Brayden (machine tracking + comprehensive testing), with everyone testing throughout.

---

## Decisions Made

1. **Super Admin backend** → Braden (owns hub aggregation; he writes the super admin data endpoints)
2. **Rewards program** → UI only this sprint (Barrett builds the page; no backend points model needed yet)
3. **Machine status boundary** → Brayden builds the system (state machine, models, API); Nathan's repair staff dashboard calls those endpoints
4. **Test data creation** → Brayden (natural fit as part of testing setup)
5. **Staff dashboard frontend** → Barrett builds all three new dashboard UIs

---

## Braden — Architecture, Databases & Super Admin Backend

### Decentralized System
- Set up Google Cloud Platform (GCP) infrastructure
- Create store and supply hub data model configurations
- Implement P2P communication protocols (store-to-store, store-to-hub, hub-to-hub)
- Implement user information replication across regional nodes
- Implement revenue aggregation from distributed stores
- Implement certificate-based authentication between nodes
- Implement token-based authentication between nodes
- Implement 6 inter-node REST endpoints:
  - `/user-lookup/`
  - `/user-sync/`
  - `/status-update/`
  - `/store-registry/`
  - `/supply-request/`
  - `/health-check/`

### Database Schema (all 7 new tables)
- Machine table
- Schedule table
- Super Admin table
- Repair Staff table
- Logistics Manager table
- Region table
- Supply Hub table

### Super Admin Backend Endpoints
- National revenue aggregation (query all 7 regional hubs)
- System-wide store and hub health queries
- Super Admin user management endpoints (national scope)

### Key Coordination Points
- DB schema review with Nathan, Brayden, and Jordan **before each starts implementation**
- Machine table spec → Brayden
- Logistics/Repair Staff/Schedule table spec → Nathan

### Primary Files
- `codepop_backend/backend/models.py`
- `codepop_backend/codepop_backend/settings.py`
- New hub Django app (if needed)
- GCP config files

---

## Jordan — API Integration & Chatbot Page

### Stripe Integration
- Update existing Stripe keys and complete the payment integration
- Implement fake money system for testing
- Implement Stripe encryption for payment transactions
- Wire Stripe webhook for order status updates (coordinate with Nathan)

### Mapbox Integration
- Integrate Mapbox SDK for geolocation (replacing current react-native-maps prototype)
- Implement ETA calculation based on user location and order queue
- Implement nearest store finder (backend proximity query + coordinate with Barrett for UI)

### Dialogflow Integration
- Replace current DialoGPT (`customerAI.py`) with Google Dialogflow ES
- Implement session management and intent routing
- Update `ComplaintsPage.js` to work with new Dialogflow backend

### Primary Files
- `codepop_backend/backend/customerAI.py` (replace with Dialogflow)
- `codepop_backend/backend/views.py` (new geolocation + chatbot endpoints)
- `codepop/src/pages/ComplaintsPage.js`
- `codepop/src/pages/CartPage.js` (Stripe updates)
- `codepop/src/pages/PostCheckout.js` (Mapbox swap)
- `codepop_backend/codepop_backend/settings.py` (API keys)

---

## Barrett — UI/UX

### Design System
- Create UI design rules document at `.claude/codepop/ui-rules.md`
  - Color scheme
  - Logo usage
  - Button styles
  - Font specs
- Apply rules consistently across all existing pages/screens

### New Staff Dashboards (UI layer + frontend implementation)
- Logistics Manager dashboard
- Super Admin dashboard
- Repair Staff dashboard

### Existing Dashboard Updates
- Update Manager dashboard with new features and role restrictions
- Update Admin dashboard with new features

### New User Features
- Implement light/dark mode toggle across the app
- Add rewards program page (UI only this sprint — points/redemption display with placeholder data)
- Nearest store finder UI (wired to Jordan's Mapbox endpoint)

### Primary Files
- `codepop/src/pages/ManagerDash.js`
- `codepop/src/pages/AdminDash.js`
- `codepop/App.js` (new screen registrations)
- `codepop/src/pages/LogisticsManagerDash.js` (new)
- `codepop/src/pages/RepairStaffDash.js` (new)
- `codepop/src/pages/SuperAdminDash.js` (new)
- `codepop/src/components/` (shared components)
- `.claude/codepop/ui-rules.md` (new)

---

## Nathan — Logistics & Repair Staff Backend

### Logistics Manager
- Implement logistics optimization bot backend
- Implement supply request approval and denial workflow
- Build all backend API endpoints for the Logistics Manager dashboard
  - Supply levels
  - Route suggestions
  - Usage trends
  - Supply request status

### Repair Staff
- Implement CSV schedule upload backend (parse, validate, store)
- Implement schedule viewing backend endpoint
- Build all backend API endpoints for the Repair Staff dashboard
  - Schedule retrieval
  - Repair job assignment
  - Escalation

### Role Updates
- Update Admin and Manager role permissions/restrictions
- Add authentication/authorization guards for new roles
  - Logistics Manager
  - Repair Staff
  - Super Admin

### Primary Files
- `codepop_backend/backend/views.py` (new endpoints)
- `codepop_backend/backend/urls.py` (new URL patterns)
- `codepop_backend/backend/serializers.py` (new serializers)
- `codepop_backend/backend/models.py` (building on Braden's new tables)

---

## Brayden — Machine Tracking & Testing

### Machine Tracking (backend system)
- Implement machine status state machine and all state transitions
  - NORMAL → WARNING → ERROR → OUT_OF_ORDER → REPAIR_START → REPAIR_END → NORMAL
- Implement machine status update API endpoints (called by repair staff UI)
- Implement store query mechanism for retrieving peer store machine status
- Implement repair tracking system (maintenance logs, repair history)

### Test Data Creation
- Test data for stores and supply hubs across all regions
- Test user accounts for each role type
  - Customer
  - Manager
  - Admin
  - Logistics Manager
  - Repair Staff
  - Super Admin
- Test machine inventory data with various statuses
- Test repair staff schedules with various scenarios

### Comprehensive Testing
- Review existing `tests.py`, add missing edge-case tests
- Backend test suites for all new features:
  - **UserRoleTests** (access control for all 6 roles)
  - **MachineTests** and **MaintenanceLogTests**
  - **UserReplicationTests** (lazy P2P replication)
  - **RevenueAggregationTests** (regional and national rollup)
  - **SupplyRequestTests** (full lifecycle)
  - **StripePaymentTests** (mocked)
  - **GeolocationTests** (mocked Mapbox)
- Frontend tests using Jest + React Native Testing Library:
  - All 3 new dashboard screens
  - UI snapshot tests for color/font/logo compliance
  - Component render tests for loading/error states

### Primary Files
- `codepop_backend/backend/tests.py`
- `codepop_backend/backend/views.py` (machine tracking views)
- `codepop_backend/backend/management/commands/populate_db.py`
- `codepop/src/__tests__/` (new frontend test directory)

---

## Key Coordination Points

| # | Who → Who | What | When |
|---|---|---|---|
| 1 | Braden → Nathan | Logistics/Repair Staff/Schedule table schema | Before Nathan starts |
| 2 | Braden → Brayden | Machine table schema | Before Brayden starts |
| 3 | Braden → Jordan | Any API-related schema needs | Before Jordan starts |
| 4 | Nathan → Barrett | Backend endpoint contracts for dashboard wiring | During implementation |
| 5 | Jordan → Barrett | Mapbox API interface for nearest store finder UI | During implementation |
| 6 | Jordan → Nathan | Stripe webhook triggers for order status updates | During implementation |
| 7 | Brayden → Nathan | Machine status endpoint spec (repair staff dashboard calls) | Before Nathan implements UI hooks |
| 8 | Braden → Barrett | Super Admin data available from hub aggregation | Before Barrett builds Super Admin dashboard |

---

## Files to Create/Modify Summary

| File | Owner |
|---|---|
| `codepop_backend/backend/models.py` | Braden (schema) + all (implement on top) |
| `codepop_backend/backend/views.py` | Jordan + Nathan + Brayden + Braden (each adds own) |
| `codepop_backend/backend/urls.py` | Jordan + Nathan + Brayden |
| `codepop_backend/backend/serializers.py` | Nathan + Brayden |
| `codepop_backend/backend/customerAI.py` | Jordan (replace) |
| `codepop_backend/backend/tests.py` | Brayden |
| `codepop_backend/backend/management/commands/populate_db.py` | Brayden |
| `codepop/src/pages/ComplaintsPage.js` | Jordan |
| `codepop/src/pages/CartPage.js` | Jordan |
| `codepop/src/pages/PostCheckout.js` | Jordan |
| `codepop/src/pages/ManagerDash.js` | Barrett |
| `codepop/src/pages/AdminDash.js` | Barrett |
| `codepop/src/pages/LogisticsManagerDash.js` (new) | Barrett |
| `codepop/src/pages/RepairStaffDash.js` (new) | Barrett |
| `codepop/src/pages/SuperAdminDash.js` (new) | Barrett |
| `codepop/App.js` | Barrett |
| `.claude/codepop/ui-rules.md` (new) | Barrett |
| `codepop/src/__tests__/` (new) | Brayden |

---

*Generated on 2026-03-02*
