# CodePop Multi-Store Architecture & Data Brief

## Purpose
- Summarize the target multi-store architecture and expanded data model
- Give teammates a quick reference for Section 3 (Architecture Design) and Section 5 (Data Design)

## Architecture Design Highlights

### Network Topology Overview
- Each storefront runs a full Django/PostgreSQL stack with its own `NodeConfig` identity, peer registry, and event queue (`PLAN.md`).
- Seven regional supply hubs operate as specialized peers that coordinate logistics and hold the authoritative registry for stores in their 1000-mile radius (`PLAN_PHASE_3_SUPPLY_HUB.md`).
- Mobile clients locate the nearest healthy store via hub discovery and can fail over to alternate peers if the primary store goes offline.

### Regional & Store Roles
- **Store Node**: Processes customer orders, tracks local inventory/revenue, publishes events for cross-store data, and maintains a heartbeat with known peers.
- **Supply Hub Node**: Aggregates regional inventory, approves supply requests, schedules deliveries, and brokers inter-store introductions.
- **Service Discovery Layer**: Static hub bootstrap → hub registry → peer heartbeat sequence keeps the network connected even as nodes join/leave.

### Store-to-Hub Communication Flow
- Synchronous REST APIs handle real-time workflows: auth lookups, supply request submission, store discovery, and health checks.
- Asynchronous Celery/Redis queues deliver eventual-consistency events (user profile updates, machine status changes, cross-store favorites).
- Delivery scheduling and approvals flow store → hub → confirmed delivery events broadcast back to relevant stores.

### Services & Infrastructure Components
- **Core Stack**: Django REST backend per node, PostgreSQL for persistent data, Celery workers, Redis broker, optional RabbitMQ fallback.
- **P2P Support**: `PeerNode` and `P2PEvent` models, hub registry services, heartbeat scheduler, background tasks for event retry/cleanup.
- **Analytics & Forecasting**: Supply hubs run scikit-learn demand forecasting fed by CSV uploads and historical delivery data.
- **DevOps**: Docker Compose baseline for local multi-node setups; future phases add Terraform scripts for regional deployment.

### Resilience & Operational Considerations
- Heartbeat tasks mark peers unreachable within two minutes and trigger client failover guidance.
- Stores operate autonomously with a local-first data policy; hubs and peers reconcile when connectivity is restored.
- Event retries/backoff prevent message loss; audit trails on events and deliveries aid incident response.

## Data Design Highlights

### New Core Entities
- `Region`: Geographic scope with center coordinates, service radius, and hub linkage (Phase 1).
- `SupplyHub`: One-to-one with Region; stores address info, delivery capabilities, contact channels.
- `Store`: Node metadata (store number, coordinates, API URL, hours, operational flags).
- `SupplyRequest` & `SupplyDelivery`: Track logistics workflow from submission through fulfillment, including urgency, routing, and delivery stops (Phase 3).
- `Machine`, `MaintenanceLog`, `RepairSchedule`: Capture per-store robot status, historical maintenance actions, and scheduled repairs (Phase 4).

### Relationship & Scope Changes
- Region ⇄ SupplyHub (1:1) anchors the regional hierarchy; Region ⇄ Store (1:N) captures all storefronts in scope.
- Store ⇄ SupplyRequest (1:N) and SupplyRequest ⇄ SupplyDelivery (1:N) model logistics lifecycle.
- Store ⇄ Machine is 1:1; Machine ⇄ MaintenanceLog / RepairSchedule is 1:N for operational history.
- Role scoping: managers tied to a single store, logistics managers to region + hub, repair staff to region (Phase 2).

### Schema Evolution Notes
- Existing models gain `store_id` foreign keys to enforce store-level ownership (inventory, orders, revenue, preferences).
- New indexes support high-volume queries: status/urgency filters on requests, geo lookups on stores, schedule/date filters on repairs.
- JSON fields store flexible payloads (delivery stops, parts replaced, hours of operation) with validation handled at serializer layer.
- Helper methods (distance calculations, uptime metrics) encapsulate business logic for reuse across services.

### Data Isolation Strategy
- Store-local tables (orders, inventory, revenue, machine status) never leave the node unless explicitly published as events.
- Replicated datasets (user accounts, preferences, logistics events) propagate via P2P events with conflict resolution handled by hub arbitration rules.
- Regional hubs maintain aggregate inventory/delivery data scoped to their region to avoid cross-region bleed.

### Diagram & Documentation References
- Update `docs/P2P_ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and new ER diagrams to align with the above models.
- Regional topology and logistics sequence diagrams live in Phase 3 materials; reuse them for the shared deliverables.
- Maintenance swim-lanes in Phase 4 plan illustrate Machine → RepairSchedule interactions—embed or link in final document set.

## Suggested Next Steps

- **Implementation checkpoints**
  - Finalize Django model migrations for Region/Store/SupplyHub/Machine families.
  - Stand up dual-node Docker environment (store + hub) to validate discovery, heartbeats, and supply request flow.
  - Configure Celery + Redis locally and document worker startup in Makefile/README.
- **Hand-off notes**
  - Share API contract drafts with frontend team for supply requests, machine status, and discovery endpoints.
  - Coordinate with DevOps lead on Terraform/infra requirements derived from the regional deployment plan.
- **Open questions**
  - Confirm final conflict resolution policy for simultaneous cross-store updates.
  - Decide on production messaging broker (Redis vs RabbitMQ) before Phase 0 completion.
  - Align on cadence for ER diagram updates and storage location in repo (`docs/` folder proposal).

