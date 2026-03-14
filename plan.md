# CodePop Distributed System Refactor — Implementation Plan

**Architecture:** Hub mesh + regional stores (no master hub)  
**Migration strategy:** Squash existing migrations and create a single fresh initial migration (start over with one clean schema).  
**Last updated:** 2026-03-14

---

## Table of Contents

1. [Guiding Principles](#1-guiding-principles)
2. [Core Configuration & Roles](#2-core-configuration--roles)
3. [Data Models](#3-data-models)
4. [Store ↔ Hub Protocols](#4-store--hub-protocols)
5. [Hub ↔ Hub Mesh](#5-hub--hub-mesh)
6. [User Routing & Uniqueness](#6-user-routing--uniqueness)
7. [Writes from Visiting Stores to Home Store](#7-writes-from-visiting-stores-to-home-store)
8. [Password Verification & Visiting Login](#8-password-verification--visiting-login)
9. [Celery Tasks & Event Queue](#9-celery-tasks--event-queue)
10. [Security Hardening](#10-security-hardening)
11. [Documentation & Demo](#11-documentation--demo)
12. [Database Models Audit](#12-database-models-audit)
13. [Implementation Order](#13-implementation-order)

---

## 1. Guiding Principles

- **No master hub.** Only hubs (regional coordinators) and stores (customer-facing nodes).
- **User data ownership:**
  - **Home store:** Canonical user record and persistent preferences/favorites. Keeps data forever.
  - **Visiting store:** Short-lived cache and visiting-session state. Cache has a TTL; data is deleted after expiry.
  - **Hubs:** Routing tables only (email → home store). No full user profile/preferences stored at hubs.
- **Traffic rules:**
  - Store → Hub: Always one `UPSTREAM_HUB_URL` (store’s regional hub).
  - Hub ↔ Hub: Mesh via `PEER_HUB_URLS`.
  - Store ↔ Store: Only for **home-store data** (read or write). Same-region: Store B ↔ Store A. Cross-region: Store C ↔ Store A after routing via hubs.

---

## 2. Core Configuration & Roles

### 2.1 Settings (`codepop_backend/codepop_backend/settings.py`)

**Add or standardize:**

| Setting | Purpose | Used by |
|--------|---------|---------|
| `NODE_ROLE` | `'hub'` or `'store'` | All nodes |
| `REGION` | Region identifier (e.g. `logan`, `atlanta`) | All nodes |
| `STORE_ID` | Unique integer ID per node | All nodes |
| `STORE_NAME` | Human-readable name | All nodes |
| `API_ENDPOINT` | Base URL of this node | All nodes |
| `UPSTREAM_HUB_URL` | Base URL of regional hub | Stores only |
| `PEER_HUB_URLS` | Comma-separated list of other hub base URLs | Hubs only |

**Deprecate / remove:**

- `IS_MASTER` — remove from middleware and settings.
- `IS_HUB` — derive from `NODE_ROLE == 'hub'` (optional convenience boolean).
- `HUB_URL` — for stores, use `UPSTREAM_HUB_URL`; for hubs, do not use a single “my hub” URL.

**Validation (at startup):**

- Always required: `SECRET_KEY`, `STORE_ID`, `REGION`, `API_ENDPOINT`.
- If `NODE_ROLE == 'store'`: require non-empty `UPSTREAM_HUB_URL`.
- If `NODE_ROLE == 'hub'`: validate `PEER_HUB_URLS` as URLs when present (can be empty for single-hub).
- Require `INTER_NODE_SECRET` (or per-node certs) when `NODE_ROLE == 'hub'` or when `UPSTREAM_HUB_URL` / `PEER_HUB_URLS` are set.

### 2.2 Middleware (`codepop_backend/backend/middleware.py`)

- **Read from settings:** `NODE_ROLE`, `UPSTREAM_HUB_URL` (if store), `PEER_HUB_URLS` (if hub).
- **Expose on `request.node_identity`:**
  - `store_id`, `store_name`, `region`, `api_endpoint`, `node_role`
  - Optionally: `is_hub` (derived), `upstream_hub_url` (if store).
- **Remove:** `is_master`; stop reading `IS_MASTER` and `IS_HUB` from settings (derive from `NODE_ROLE`).
- **Validation in `__init__`:** If node participates in distributed system, require `STORE_ID`, `REGION`, `API_ENDPOINT`, and appropriate hub URL(s).

---

## 3. Data Models

### 3.1 StoreRegistry (`backend/models.py`)

- **Semantics:** “Stores in my region” — used **only by hubs**.
- **Fields:** Keep existing: `store_id`, `store_name`, `region`, `latitude`, `longitude`, `api_endpoint`, `is_active`, `last_heartbeat`, `registered_at`, etc.
- Stores do not read or write this table.

### 3.2 HubRegistry (`backend/models.py`)

- **Semantics:** “Hubs I know about” — used by hubs (read/write), optionally read-only by stores for display.
- **Fields:** `hub_id`, `region`, `api_endpoint`, `is_active`, `last_seen`, `registered_at`, and optionally `issued_secret` (or move auth to NodeCertificate only).
- Hubs update this for themselves and all peers; stores do not write.

### 3.3 NodeCertificate (`backend/models.py`)

- **Usage:**
  - **Store:** One row per store for hub↔store auth: `node_id = f"store-{STORE_ID}"`, `node_type = 'store'`, `shared_secret` from hub.
  - **Hub:** One or more rows for hub↔hub auth: `node_id = f"hub-{STORE_ID}"`, `node_type = 'hub'`.
- **Auth:** `NodeTokenAuthentication` looks up active `NodeCertificate` by `shared_secret` and attaches `request.node_principal`. `IsInterNodeRequest` requires a valid node principal; optionally restrict by `node_type` per endpoint.

### 3.4 UserCache (`backend/models.py`)

- **At home store:** Full routing + long TTL (e.g. 10 years) for home users.
- **At hubs:** Routing only (email → home_store_id, home_store_endpoint). TTL moderate (e.g. 24–72 hours).
- **At visiting stores:** Routing + optional short-lived copy of user data for UX. TTL short (e.g. 24h or until logout); data deleted after TTL.

### 3.5 VisitingSession (`backend/models.py`)

- Links visiting user’s local token to JWT/session from home store. Used to detect “visiting user” and to forward writes to home store.

---

## 4. Store ↔ Hub Protocols

### 4.1 Hub endpoints (hubs only)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/backend/hub/register/` | Store registers with hub | NodeToken |
| POST | `/backend/hub/heartbeat/` | Store sends liveness | NodeToken |
| POST | `/backend/hub/user-sync/` | Home store informs hub of user | NodeToken |

**`POST /backend/hub/register/`**

- Body: `store_id`, `store_name`, `region`, `latitude`, `longitude`, `api_endpoint`, `public_key` (optional).
- Hub: Upsert `StoreRegistry`, create/update `NodeCertificate` for store, return `store_secret` and optional `known_sibling_stores`.

**`POST /backend/hub/heartbeat/`**

- Body: `store_id`.
- Hub: Update `StoreRegistry.last_heartbeat`, `is_active=True`; return `status`, `timestamp`.

**`POST /backend/hub/user-sync/`**

- Body: `email`, `user_id`, `home_store_id`, `home_store_endpoint`.
- Hub: Upsert routing-only entry in `UserCache`; enqueue events to all `PEER_HUB_URLS` for hub-mesh sync.

### 4.2 Store-side behavior

- **Startup:** Celery task posts to `UPSTREAM_HUB_URL/backend/hub/register/` with exponential backoff until success; store saves returned `store_secret` in `NodeCertificate`.
- **Periodic:** Celery task posts to `UPSTREAM_HUB_URL/backend/hub/heartbeat/` every 30s using per-node secret.
- **On user registration (home store):** After creating user, update local `UserCache` (long TTL), then POST to `UPSTREAM_HUB_URL/backend/hub/user-sync/` with routing info. Hub fans out to other hubs.

---

## 5. Hub ↔ Hub Mesh

### 5.1 Hub-mesh endpoints (hubs only)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/backend/hub-mesh/user-location/?email=...` | Look up user’s home store | NodeToken (hub) |
| POST | `/backend/hub-mesh/user-sync/` | Receive routing from another hub | NodeToken (hub) |

- **user-location:** Hub checks its `UserCache`; returns `found` with `home_store_id`, `home_store_endpoint` or `not_found`.
- **user-sync:** Hub upserts routing in `UserCache` (time-bound TTL), writes `SyncRecord`.

### 5.2 Mesh behavior

- Each hub maintains `HubRegistry` from `PEER_HUB_URLS` and successful calls.
- When hub receives `user-sync` from a store in its region, it enqueues one event per peer in `PEER_HUB_URLS` with target `/backend/hub-mesh/user-sync/`.
- Optional: periodic hub health checks and `check_dead_hubs` task to mark inactive hubs in `HubRegistry`.

---

## 6. User Routing & Uniqueness

### 6.1 Discovery (store needs to find user’s home store)

1. Visiting store checks local DB (home user?) and local `UserCache` (routing).
2. If not found, store asks **its hub** (e.g. `GET /backend/internode/user-route/?email=...`).
3. Hub checks its routing cache; if not found, broadcasts `GET /backend/hub-mesh/user-location/?email=...` to all `PEER_HUB_URLS`.
4. First “found” response gives `home_store_endpoint`; hub caches and returns to store.
5. Store then fetches **user data (profile, preferences, favorites) directly from home store** and caches with TTL; does not store long-term.

### 6.2 Email uniqueness (registration)

1. Store (candidate home store) checks local DB.
2. Store asks its hub: “does this email exist anywhere?”
3. Hub checks its routing table; if not found, broadcasts to peer hubs via `hub-mesh/user-location`.
4. If any hub returns “found,” hub tells store “email exists”; store rejects registration with clear error.

### 6.3 TTLs

- **Home store UserCache:** Long (e.g. 10 years) for home users.
- **Hub UserCache:** Moderate (24–72 hours), refreshed on sync/lookup.
- **Visiting store cache:** Short (e.g. 24h or until logout); delete after TTL.

---

## 7. Writes from Visiting Stores to Home Store

### 7.1 Rule

All account-related writes (preferences, profile, favorites) from a **visiting** user are applied **only at the home store**. The visiting store **forwards** the update and optionally refreshes its local short-lived cache.

### 7.2 Visiting store logic

- For mutation endpoints (preferences, profile, favorites):
  - If user is visiting (e.g. via `VisitingSession` or `home_store_id != STORE_ID`):
    - Call home store’s inter-node write API over HTTPS with NodeToken.
    - Example: `POST {home_store_endpoint}/backend/internode/user-preferences/update/`.
    - On success: update local cache with response.
    - On failure: fail fast with clear error, or enqueue retry in `EventQueue` (idempotent).
  - If user is home user: apply change locally as today.

### 7.3 Home store inter-node write APIs

- **Endpoints (examples):**
  - `POST /backend/internode/user-preferences/update/`
  - `POST /backend/internode/user-profile/update/`
- **Auth:** NodeTokenAuthentication, IsInterNodeRequest.
- **Behavior:** Validate payload, update local DB and `UserCache` as needed, return updated representation. Optionally trigger `user-sync` to hub if email/profile changed.

---

## 8. Password Verification & Visiting Login

### 8.1 Principle

Only the **home store** verifies the password. The visiting store **never** verifies or stores the password (or hash).

### 8.2 Flow

1. User submits **email + password** at Store B (visiting) over **HTTPS**.
2. Store B resolves home store via routing (local cache or hub).
3. Store B calls **Store A** (home store):  
   `POST {home_store_endpoint}/backend/internode/verify-credentials/`  
   Body: `{ "email": "...", "password": "..." }`  
   Over **HTTPS** and **NodeToken** auth.
4. Store A verifies password (e.g. `User.check_password`); if valid, creates JWT/session and returns it (and minimal profile) to Store B; otherwise 401.
5. Store B never stores password. On success: create `VisitingSession` with JWT, issue token to client. On failure: return 401.

### 8.3 Optional hardening

- Client could encrypt password with home store’s public key and send ciphertext; Store B forwards blob to Store A; Store A decrypts and verifies. Store B then never sees plaintext. Document as optional; TLS + forward-only is the baseline.

---

## 9. Celery Tasks & Event Queue

### 9.1 Task layout (`backend/tasks.py`)

- **Store tasks:** `store_register_with_hub`, `store_heartbeat`.
- **Hub tasks:** `hub_broadcast_user_sync` (or use generic `process_event_queue` for hub→hub events), `check_dead_stores`, optional `check_dead_hubs`.
- **Generic:** `process_event_queue` — single delivery engine; document event types and ensure idempotent handling and retry/backoff.

### 9.2 Event schema

- Standardize: `event_type`, `target_node`, `payload`, `attempts`, `last_attempt`, `status`.
- Retries: exponential backoff, max attempts, then mark failed and write `SyncRecord` with error.

---

## 10. Security Hardening

- **Inter-node endpoints:** All `/backend/hub/`, `/backend/hub-mesh/`, `/backend/internode/` use NodeTokenAuthentication + IsInterNodeRequest. Optionally restrict hub-mesh to `node_type == 'hub'` and store→hub to `node_type == 'store'`.
- **Application endpoints:** Audit visiting session creation, JWT handling, role checks; remove inappropriate `AllowAny`.
- **Secrets:** Prefer per-node `NodeCertificate`; use `INTER_NODE_SECRET` only as dev fallback and document.

---

## 11. Documentation & Demo

- **CurrentHighLevelDesign.md:** Describe hub mesh + regional stores; diagrams for store↔hub and hub↔hub; user data ownership and visiting flows.
- **CurrentLowLevelDesign.md:** Settings, models, endpoints (URIs and payloads).
- **GCP_Distributed_Testing_Guide.md:** Nodes as hub/store only; test same-region and cross-region discovery and write-through; remove master-hub phases.
- **demo.html:** Topology without master hub; hubs in mesh, stores attached to hubs; phases aligned with new flows.

---

## 12. Database Models Audit

This section lists every current model, whether it is required for the refactor + docs, and any migration or schema cleanup needed.

### 12.1 Models required by the implementation plan

| Model | Where used | Notes |
|-------|------------|--------|
| **StoreRegistry** | Hubs only | “Stores in my region.” Keep as-is. Stores do not read/write. |
| **HubRegistry** | Hubs (r/w), stores (read-only optional) | “Hubs I know about.” Keep. Remove `is_master` from DB if still present (see migrations). |
| **NodeCertificate** | Inter-node auth | Per-node/hub shared secrets. Keep. Remove `'master'` from `node_type` choices. |
| **UserCache** | All nodes | Routing only (email → home_store_id, home_store_endpoint). Already aligned with plan after 0002. |
| **VisitingSession** | Stores | Links local token to home-store JWT. Keep. |
| **SyncRecord** | All nodes | Audit trail for sync/credential events. Keep. |
| **EventQueue** | All nodes | Outbound async events for Celery. Keep. Optionally add event type for hub-mesh user_sync. |

### 12.2 Core business models (store-level, required for product)

| Model | Purpose | Plan/docs |
|-------|---------|-----------|
| **Preference** | User flavor preferences (home store owns) | Required; preferences are user data at home store. |
| **Drink** | Drink catalog, favorites (M2M with User) | Required; orders and favorites depend on it. |
| **Inventory** | Store stock levels | Required; local to each store. |
| **Notification** | User alerts | Required; local to store. |
| **Order** | Customer orders | Required; local to store. |
| **Revenue** | Financial records per order | Required; local to store. |

All of these stay. No structural changes needed for the refactor.

### 12.3 Supply and logistics (hub-managed, required by docs/views)

| Model | Purpose | Used in code? | Verdict |
|-------|---------|----------------|---------|
| **SupplyRequest** | Store → hub supply requests | Yes: `HubSupplyRequestListView`, `HubSupplyRequestActionView`, `InterNodeSupplyRequestView` | **Keep.** Aligns with plan (store talks to hub for supply). |

### 12.4 Feature / role models (docs mention; keep or simplify)

| Model | Purpose | Used in code? | Verdict |
|-------|---------|----------------|---------|
| **Region** | Geographic region metadata (name, hub_api_endpoint) | Yes: FK from `SupplyHub`, `LogisticsManagerProfile` | **Keep.** Used for logistics manager region scoping and SupplyHub. In plan, “region” is also a string in settings/registries; Region table is the canonical list for UI/roles. **Migration:** Drop `is_master` from Region if still in DB (0001 created it). |
| **SupplyHub** | Supply hub metadata (address, contact, inventory_notes) per region | Admin only; no views reference it | **Keep for now.** Docs describe “SupplyHub” as logistics centers. Can be used for contact info or future hub inventory UI. If we never need it, we can deprecate later and rely on HubRegistry + settings. |
| **Machine** | Robotic machine status (state machine) | Yes: `InterNodeStatusUpdateView` | **Keep.** Required for machine status and repair flow (docs and plan). |
| **Schedule** | Repair staff shift schedules | Admin only; no views reference it | **Keep.** LLD and requirements reference repair scheduling; implement when building that feature. |
| **RepairStaffProfile** | User extension for repair staff role | Admin only | **Keep.** Needed for repair staff permissions and future Schedule/repair flows. |
| **LogisticsManagerProfile** | User extension for logistics manager, scoped by Region | Admin only | **Keep.** Required for logistics manager role and region-scoped dashboards (docs). |

### 12.5 Models we do **not** need to add

The plan does not introduce new models. Existing tables cover:

- **Routing:** UserCache (routing only at hubs/stores).
- **Sessions:** VisitingSession.
- **Registries:** StoreRegistry, HubRegistry.
- **Auth:** NodeCertificate.
- **Audit/events:** SyncRecord, EventQueue.

### 12.6 Migration strategy: squash and start fresh

We are **not** adding incremental migrations on top of the existing ones. We treat this as a full reset:

- **Remove all existing migration files** in `backend/migrations/` except `__init__.py` (i.e. delete `0001_initial.py`, `0002_jwt_architecture.py`, and any others).
- **Ensure `models.py` is in its final shape** for the new system:
  - **HubRegistry:** No `is_master` field (remove it if it exists in the model).
  - **Region:** No `is_master` field.
  - **NodeCertificate:** `node_type` choices are only `('store', 'Store')` and `('hub', 'Hub')` — no `'master'`.
  - **UserCache:** Routing-only fields (`user_email`, `user_id`, `home_store_id`, `home_store_endpoint`, `cached_at`, `expires_at`) — no `user_data`, no `source_store_id`.
- **Create a single new initial migration** after the above is done:
  - Run `python manage.py makemigrations backend` to generate one new `0001_initial.py` that matches the current `models.py`.
- **Apply it on a clean database:**
  - New deployments: run `migrate` as usual; they get the new schema from the single initial.
  - Existing databases (e.g. dev DBs that already ran the old migrations): either **drop and recreate** the database and run `migrate`, or run Django’s `migrate --run-syncdb` / manual steps only if you need to preserve data (not typical for a “start fresh” reset).

**When to do the squash:** After Step 2 (model and auth cleanup) is complete — i.e. once `models.py` and auth code are updated and no longer reference master hub or old schema. Then delete old migrations, run `makemigrations`, and proceed with the rest of the implementation.

### 12.7 Summary

- **Keep all current models.** None are obsolete; each is required by the plan, core product, or docs/roles.
- **No incremental migrations.** Squash existing migrations and create **one fresh initial migration** that matches the final `models.py` (no `is_master`, no `master` node type, UserCache routing-only).
- **Optional later:** If we never use `SupplyHub` or `Schedule` for UI, we could deprecate them; not required for this refactor.

---

## 13. Implementation Order

Execute in this order when implementing:

| Step | Focus |
|------|--------|
| 1 | Core settings + middleware (NODE_ROLE, UPSTREAM_HUB_URL, PEER_HUB_URLS, request.node_identity). |
| 2 | Model and auth cleanup: ensure `models.py` has no `is_master` (HubRegistry, Region) and no `master` in NodeCertificate choices; tighten NodeCertificate/HubRegistry usage; restrict INTER_NODE_SECRET to dev. Then **squash migrations**: delete all migration files in `backend/migrations/` except `__init__.py`, run `makemigrations backend` to create a single new `0001_initial.py`. |
| 3 | Store↔hub flows (register, heartbeat, user-sync) and Celery tasks. |
| 4 | Hub↔hub mesh APIs and broadcast (user routing + email uniqueness). |
| 5 | Visiting-user credential verification (inter-node verify-credentials at home store; visiting store forwards). |
| 6 | Visiting-user write-through (inter-node write APIs at home store; visiting store proxies mutations). |
| 7 | Security pass on all inter-node and app endpoints. |
| 8 | Documentation and demo updates. |

---

*End of plan.*
