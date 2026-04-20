# CodePop Testing Report

---

## Summary

This report documents our testing strategy, implementation, and findings for the CodePop distributed soda ordering system. We employ a two-pronged testing approach: comprehensive automated unit and integration tests on the backend to verify component behavior and system contracts, paired with manual end-to-end testing and user acceptance testing to validate complete workflows and user experience. Testing is carried out at five distinct levels—unit (backend and frontend), integration, regression, system/E2E, and acceptance—each owned by a dedicated team member to ensure consistent coverage and early detection of defects.

---

## 1. Testing Philosophy

We believe that effective testing must be **pragmatic and proportional**. We prioritize automated testing where deterministic behavior can be verified repeatedly without brittleness—particularly for unit tests of models, views, and permissions. Equally, we recognize that some testing scenarios—visual consistency, real-device compatibility, full user workflows—are better verified through manual testing. Our goal is to maximize automation and reproducibility without over-engineering.

---

## 2. Testing Frameworks & Tools

We employ a layered testing architecture using industry-standard frameworks chosen for their maturity and ease of integration.


| Testing Level                    | Framework / Tool                    | Language            | Scope                                              | Status                |
| -------------------------------- | ----------------------------------- | ------------------- | -------------------------------------------------- | --------------------- |
| **Unit (Backend)**               | Django `TestCase`, `APITestCase`    | Python              | Models, views, permissions, serializers            | Implemented           |
| **Unit (Backend) External APIs** | `unittest.mock.patch`               | Python              | Stripe SDK, Groq SDK, HTTP calls                   | Implemented           |
| **Regression**                   | GitHub Actions      | YAML                | Test automation       | Implemented |
| **System/E2E (Mobile)**          | Expo                         | JavaScript + native | Full user workflows on real devices                | Implemented               |
| **Acceptance (UAT)**             | Manual testing, checklists          | N/A                 | User story validation, non-functional requirements | Implemented           |


**CI/CD Integration:**  
Every push to `master` triggers our GitHub Actions pipeline (`.github/workflows/deploy.yml`). Backend unit tests run automatically; tests must pass before code deploys to production (6 GCP VMs: 2 hubs + 4 stores). Currently, tests gate deployment but coverage thresholds are not yet enforced.

---

## 3. Unit Tests

### Overview

Our backend automated test suite currently runs **229 tests** across a modular test package (`/codepop_backend/backend/tests/`) that covers customer APIs, distributed flows, permissions, admin/logistics endpoints, machines, recurring orders, tasks, and Stripe behavior.

### Test Classes & Coverage


| Test Class                    | What It Tests                    | Key Test Cases                                             | Status                                    |
| ----------------------------- | -------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| **PreferenceTests**           | User flavor preferences (CRUD)   | Get/create/delete preferences, token auth, user isolation  | Implemented                               |
| **DrinkTests**                | Drink catalog and custom drinks  | CRUD, ice/size validation, user favorites, search          | Implemented                               |
| **InventoryTests**            | Stock management                 | Update quantities, out-of-stock handling, low-stock alerts | Implemented                               |
| **NotificationTests**         | User notifications               | Create/filter/delete, time-based filtering, user isolation | Implemented                               |
| **OrderTests**                | Order processing                 | Create orders, add/remove drinks, invalid drink handling   | Implemented                               |
| **RevenueTests**              | Financial tracking               | Auto-calculate totals, update after order changes          | Implemented                               |
| **AITests**                   | Drink recommendation engine (AI) | Validate Groq/Anthropic output format, preference matching | Implemented                               |
| **InterNodeAuthTests**        | Inter-node authentication        | Validate shared-secret auth between stores                 | Implemented                               |
| **StoreRegistryTests**        | Store/hub registration           | Store lifecycle, heartbeat, peer discovery setup           | Implemented                               |
| **VisitingUserCacheTests**    | Visiting user profile cache      | Cache creation, expiry, cross-region lookup                | Implemented                               |
| **PendingProfileUpdateTests** | Lazy profile sync                | Update queueing, retry logic                               | Implemented                               |
| **UserReplicationTests**      | Cross-store user replication     | Profile push/pull between stores, eventual consistency     | Implemented                               |


### Authentication & Authorization (All Test Suites)

Each test suite verifies that:

- **Token-based authentication** works: users with valid DRF tokens can access protected endpoints; requests without tokens receive `401 Unauthorized`
- **Authorization** is enforced: a user accessing another user's data receives `403 Forbidden`
- **Unauthenticated requests** are blocked: endpoints like `/api/orders/` and `/api/preferences/` return `401` when no token is provided

### Challenging Aspects of Backend Testing

**1. AI Model Testing (AITests)**  
The AI recommendation engine uses an external service (Groq API via Anthropic SDK). Testing this required us to mock the API call to return deterministic JSON responses.

**2. Distributed System Testing (InterNode, StoreRegistry, UserReplication)**  
These tests verify that a store can register with a hub, receive heartbeat acknowledgments, and replicate user profiles across regions. We needed to:

- Simulating realistic network scenarios (e.g., hub unreachable → cache hit instead)
- Verifying eventual consistency without full integration (avoiding the need to run multiple Docker containers in unit tests)

**3. Celery Background Tasks (Now Covered)**  
We use Celery for async operations (cleanup of expired cache, retry of failed profile syncs, heartbeat monitoring). These tasks are now covered by dedicated tests (`test_tasks.py`) using `CELERY_TASK_ALWAYS_EAGER=True` so async behavior can be validated deterministically in test runs.

---

## 4. Integration Tests

Integration tests verify that multiple components work together correctly across API, database, and external service boundaries. These tests simulate realistic multi-step workflows by hitting real API endpoints against a transactional test database, with external HTTP calls mocked.

### Implementation Status

| Scenario | Test File | Status | Notes |
|----------|-----------|--------|-------|
| **Auth Flow Integration** | `test_customer_api.py` | Partially implemented | Token-protected endpoint behavior is covered; full register-login-me standalone flow is not yet isolated in a dedicated class |
| **Order Lifecycle Integration** | `test_customer_api.py`, `test_stripe.py` | Partially implemented | Order creation/update and payment-intent path are covered, but not as one consolidated end-to-end integration case |
| **Celery Task Integration** | `test_tasks.py` | Implemented | `CeleryTaskTests`: heartbeat, cleanup, retry/backoff, expiry, and missed-heartbeat checks |
| **Visiting User Distributed Flow** | `test_distributed.py` | Implemented | `UserReplicationTests`: multi-store login with hub queries and unavailable-home-store handling |
| **Stripe Payment Integration** | `test_stripe.py` | Implemented | `StripePaymentTests`: success plus validation/auth/error edge cases with mocked Stripe SDK |
| **Inter-Node Authentication** | `test_distributed.py`, `test_internode_views.py` | Implemented | Shared-secret auth and token-verification paths for store-hub communication are covered |

### Implemented Integration Tests

#### 1. Celery Task Integration (test_tasks.py — CeleryTaskTests)
Tests async tasks in a synchronous context using `@override_settings(CELERY_TASK_ALWAYS_EAGER=True)`:
- `test_cleanup_deletes_expired_cache()` — Verifies expired visiting user cache entries are removed
- `test_cleanup_keeps_fresh_cache()` — Verifies active cache entries survive cleanup
- `test_process_pending_success()` — Profile updates successfully sync to home store
- `test_process_pending_retry_on_failure()` — Failed syncs trigger exponential backoff retry
- `test_process_pending_expires_after_24h()` — Expired pending updates are marked expired and skipped
- `test_check_missed_heartbeats_marks_unreachable()` — Hub marks silent stores as unreachable
- `test_heartbeat_success()` / `test_heartbeat_no_hub_url()` / `test_heartbeat_triggers_reregister_on_404()` — Heartbeat operational behavior and re-registration fallback

#### 2. Visiting User Distributed Flow (test_distributed.py — UserReplicationTests)
Tests multi-store login with mocked inter-node HTTP calls:
- `test_visiting_user_triggers_hub_lookup()` — Unknown user at store triggers hub query, caches profile, returns token
- `test_home_store_unreachable_no_cache_returns_503()` — Hub reachable but home store down returns 503

#### 3. Stripe Payment Integration (test_stripe.py — StripePaymentTests)
Tests payment intent creation with mocked Stripe SDK:
- `test_stripe_config_returns_publishable_key()` — Public key endpoint accessible
- `test_create_payment_intent_success()` — Payment intent creation returns required client fields
- `test_create_payment_intent_requires_auth()` — Unauthenticated requests are rejected
- `test_create_payment_intent_missing_amount()` / `test_create_payment_intent_invalid_currency()` — Validation errors are handled correctly
- Mocks `stripe.PaymentIntent.create()` to avoid real API calls

---

## 5. Security & RBAC Testing

### Existing Auth Testing

All unit test suites verify that:

- Unauthenticated requests to protected endpoints return `401 Unauthorized`
- Users cannot access other users' data (receive `403 Forbidden` when attempting to read user2's preferences while authenticated as user1)
- Token-based access control is enforced consistently

### RBAC

Our application defines role-based permission classes in `/backend/permissions.py`:

- `IsAdmin` — only superusers
- `IsLogisticsManager` — logistics managers see only their region
- `IsRepairStaff` — repair staff see only machines in their assigned region
- `IsStore` — inter-node requests from registered stores
- `IsStoreOrAdmin` — hybrid permission

---

## 6. Code Coverage & Improvement Plan

### Current Coverage: ~79%

**How We Measured:**  
We ran `coverage.py` with the backend suite (`python3 -m coverage run codepop_backend/manage.py test backend` followed by `python3 -m coverage report`) and recorded the current total coverage at ~79%.

### Coverage Breakdown

| Module                                                                                  | Status | Reason                                                                                              |
| --------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| **Models (Preferences, Drink, Order, Revenue, Inventory, Notification)**                | ~90%   | `backend/models.py` is ~90% covered, with strong model-path testing across customer flows |
| **Models (New Distributed: StoreRegistry, VisitingUserCache, Machine, RecurringOrder)** | ~85%   | Distributed models now have dedicated suites (`test_distributed.py`, `test_machines.py`, `test_recurring_orders.py`) |
| **Views (Auth, Drink, Order endpoints)**                                                | ~62%   | Main `backend/views.py` currently reports ~62% overall coverage |
| **Views (Admin, Logistics, Manager dashboards)**                                        | ~74%   | Dashboard/admin paths are now tested (`test_admin_views.py`, `test_logistics_views.py`; `backend/admin.py` ~74%) |
| **Views (Stripe, Groq integrations)**                                                   | ~70%   | Stripe endpoint tests are strong; AI integration coverage is mixed (high in `drinkAI.py`, low in `customerAI.py`) |
| **Permissions (RBAC classes)**                                                          | ~94%   | `backend/permissions.py` now has dedicated unit tests and reports ~94% coverage |
| **Celery Tasks**                                                                        | ~92%   | `backend/tasks.py` has dedicated task tests and reports ~92% coverage |

---

## 7. End-to-End System Tests

We verify complete user workflows on a running system (Docker Compose stack) through manual end-to-end testing on real devices/environments. At this stage, E2E automation is still planned, but core user-critical flows have been executed manually.

### Execution Environment

**Backend services (local):**

```bash
cd codepop_backend && docker compose up -d
```

**Test context used for current E2E results:**

- Mobile testing on iOS and Android devices/emulators
- Backend APIs running with PostgreSQL + Redis via Docker Compose
- Stripe test card flows used for checkout validation

### Current End-to-End Coverage

| Scenario | Current Status | What Is Covered |
| -------- | -------------- | --------------- |
| **Customer purchase flow** | Manually tested | Account creation/login, browse drinks, add to cart, checkout, payment submission, order confirmation and persistence |
| **Visiting user distributed flow** | Manually tested | Login from non-home region, hub lookup behavior, cached profile use, profile update propagation expectations |
| **Role-based dashboard flow** | Planned / partially validated manually | Role routing and restricted view access; full automated cross-role E2E sequence still pending |

### Scenario 1: Customer Purchase Flow (Manually Executed)

**Objective:** Validate the complete customer path from account creation to paid order confirmation.

**Observed workflow:**

1. Open mobile app and create/sign in user account
2. Browse available drinks and add one or more items to cart
3. Proceed to checkout and submit Stripe test payment details
4. Confirm order success UI appears
5. Verify order record appears in order history/backend

**Expected outcome:**

- Order persists with correct user association and pending/created status
- Payment flow completes without app crash on supported devices
- User receives visible confirmation in app

### Scenario 2: Visiting User Distributed Flow (Manually Executed)

**Objective:** Validate cross-region behavior when a user authenticates away from their home store/hub.

**Observed workflow:**

1. Use an account whose profile exists in one region (home)
2. Point app to a different region/store endpoint
3. Log in and complete a basic browse/order action
4. Confirm user preferences/profile context is still available
5. Validate expected sync/caching behavior through app/API observations

**Expected outcome:**

- Remote region can resolve/login visiting user
- Cached profile behavior supports ordering without repeated home-store lookup
- Profile updates are queued/synced according to distributed design

### Scenario 3: Role-Based Dashboard Access (Planned E2E Consolidation)

**Objective:** Validate admin, logistics, and repair role boundaries across full dashboard navigation flows.

**Planned checks:**

1. Login as each role and verify route landing behavior
2. Confirm each role can access only role-appropriate pages/actions
3. Confirm forbidden pages/actions are blocked with redirects or `403`
4. Validate no cross-role data leakage in UI/API responses

### E2E Gaps and Next Steps

- Add automated E2E coverage (Detox for mobile, Playwright for dashboard) for the three scenarios above
- Add stable seed-data scripts for repeatable E2E execution in CI-like environments
- Add pass/fail evidence capture (screenshots/logs) per scenario for release sign-off

---

## 8. User Acceptance Testing (UAT)

We conducted UAT by walking through key user stories on the running system. Below is a summary of critical features we tested and validated.


| Feature                     | User Story                                                                        | Test Steps                                                                                                                                   | Expected Outcome                                                                                                             | Status |
| --------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Drink Customization**     | As a customer, I want to build a custom drink with my favorite syrups and add-ins | 1. Tap "Create" 2. Select syrup "Mango" 3. Add add-in "Coconut Cream" 4. Choose size "Large" 5. Tap "Add to Cart"                            | Custom drink appears in cart with all selections; total price calculated correctly                                           | Pass |
| **Seasonal Carousel**       | As a customer, I want to see limited-time seasonal drinks                         | 1. Open app 2. Scroll carousel 3. Tap "Spring Special"                                                                                       | Drink details show with "Seasonal" label; can add to cart                                                                    | Pass |
| **Recurring Orders**        | As a customer, I want to schedule repeat orders                                   | 1. Place order for "Mango Special" 2. Tap "Make Recurring" 3. Select "Every Week" 4. Set end date to 12 weeks 5. Confirm                     | Order repeats every week for 12 weeks; each week a new `Order` record created                                                | Pass |
| **Machine Repair Workflow** | As repair staff, I want to mark machines as under service                         | 1. View Machines 2. Select "Machine A3" 3. Change status: NORMAL → SCHEDULE_SERVICE → REPAIR_START → REPAIR_END → NORMAL                     | Each status change logged; manager sees "Under Repair" label during service; customers cannot order when machine unavailable | Pass |
| **Visiting User Login**     | As a traveler, I want to log in at a different store and use my saved preferences | 1. User account in Logan 2. Travel to Atlanta 3. Login at Atlanta 4. See same drink preferences (no artificial sweeteners) 5. Complete order | Profile cached; order completes; changes eventually sync to home store                                                       | Pass |


### Non-Functional Requirements We Tested


| Requirement              | Test Description                                             | Expected Outcome                     | Status                                           |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| **Page Load Time**       | Open app and measure load time to home screen                | < 3 seconds                          | Pass                                           |
| **Payment Reliability**  | Complete 5 test purchases using Stripe test card             | All succeed without error            | Pass                                           |
| **Device Compatibility** | Test on iOS 18.1 and Android 14                              | App functions on both platforms      | Pass                                           |


---

## 9. Remaining Concerns

Despite the progress we've made, we identify several areas of ongoing risk:

1. **Frontend Automated Coverage Is Still 0%**
  Backend coverage is now strong (~79% overall), but mobile and dashboard frontends still lack automated unit/integration tests. UI regressions are therefore primarily caught by manual testing.
2. **Distributed Flow Validation Is Mostly Mock-Based**
  Inter-node integration tests are implemented, but they still rely heavily on mocked network behavior. We still need repeatable real multi-node E2E validation (multiple running hubs/stores with real network timing/failure conditions).
3. **Celery Coverage Is Good, But Runtime Operations Need More Confidence**
  Core task logic is tested (`test_tasks.py`), including retries and heartbeat handling. Remaining risk is production-like broker/worker behavior (timing drift, queue backlog, retries under load).
4. **Performance and Load Characteristics Are Not Benchmarked**
  We still do not have formal load/performance tests. Throughput limits, latency under concurrency, and DB contention behavior remain unknown for production-scale traffic.

---

## 10. CI/CD Integration & Test Automation

### Our Current Setup

Tests are automatically run on every push to `master` via our GitHub Actions pipeline (`.github/workflows/deploy.yml`):

1. Checkout code
2. Set up Python 3.10 environment
3. Spin up PostgreSQL 15 and Redis 8 service containers
4. Run `python manage.py test backend` (backend tests only)
5. If tests pass → deploy to 6 GCP VMs (2 hubs + 4 stores)
6. If tests fail → block deployment; notify team

### Our Planned Enhancements

1. **Add coverage reporting** to our CI pipeline:
  ```bash
   coverage report --fail-under=70
  ```
2. **Add frontend testing matrix** (separate jobs for mobile and dashboard):
  ```yaml
   frontend-tests:
     runs-on: ubuntu-latest
     steps:
       - npm install
       - npm run test -- --coverage
  ```
3. **Add linting step** (flake8 for Python, ESLint for JavaScript):
  ```bash
   flake8 backend --max-line-length=100
  ```
4. **Upload coverage reports to Codecov** for trend tracking over time

---

## Conclusion

We have established a solid foundation for testing through a broad backend automated suite (229 tests) that gates production deployment and currently reports ~79% total backend coverage. We have manually validated core user workflows. 

However, significant gaps remain: frontend automated testing (still 0%), full real-network distributed system validation (currently mock-heavy), and performance/load confidence. Our plan to close these gaps—starting with frontend automation and stronger CI coverage workflows—positions the project for reliable scaling from a single-store prototype to a nationwide distributed system.

Our testing strategy balances pragmatism with rigor: automated tests for deterministic component behavior, manual tests for user experience and real-device compatibility, and clear ownership of each testing level to ensure consistent quality as the application evolves.

---