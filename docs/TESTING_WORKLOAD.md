# CodePop Testing Workload Distribution

A 5-person team testing strategy based on the 5 levels of software testing. Each member owns a specific testing level and is responsible for quality within that scope.

---

## Overview: 5 Levels × 5 Members

| Member | Testing Level | Scope | Primary Responsibility |
|--------|---------------|-------|------------------------|
| Brayden | **Unit Testing** | Backend | Django models, views, permissions, tasks in isolation |
| Barrett | **Unit Testing** | Frontend | React components, screens, form logic in isolation |
| Jordan | **Integration Testing** | Full Stack | API ↔ DB, Celery ↔ Redis, external APIs (Stripe, Groq) |
| Nathan | **Regression Testing** | CI/CD & Coverage | Test automation, coverage gates, detect regressions |
| Braden | **System + Acceptance Testing** | E2E & UAT | Full user workflows, manual testing, real device testing |

---

## Brayden: Unit Testing (Backend)

### Goal
Verify that every function, method, and class in the Django backend works correctly in isolation. Catch bugs early before they propagate to integration layers.

### Scope
- **Test File:** `codepop_backend/backend/tests.py` (extend existing ~1376-line file)
- **Models:** `backend/models.py`
- **Views & Endpoints:** `backend/views.py`, `backend/hub_views.py`, `backend/internode_views.py`
- **Permissions & Auth:** `backend/permissions.py`, `backend/serializers.py`
- **Background Tasks:** `backend/tasks.py` (Celery)
- **External Integrations:** Stripe SDK, Groq SDK (mock these)

### Coverage Gaps (Untested as of 2026-04-08)

#### 1. Admin Dashboard Endpoints
**File:** `backend/views.py` — various admin viewsets
**Endpoints to test:**
- `GET /api/admin/permissions/` — list all roles and their permissions
- `GET /api/admin/users/` — list users with filters (role, region)
- `POST /api/admin/users/` — create a new user (super-admin only)
- `PUT /api/admin/users/<id>/` — edit user role/region
- `PATCH /api/admin/users/<id>/enable/` — enable disabled user
- `PATCH /api/admin/users/<id>/disable/` — disable active user
- `GET /api/admin/audit-logs/` — list audit trail with time/action filters

**Test Class:** `AdminEndpointTests`
```python
class AdminEndpointTests(APITestCase):
    def test_super_admin_can_list_users(self): ...
    def test_admin_cannot_create_user(self): ...
    def test_audit_log_filters_by_date(self): ...
    def test_disable_user_removes_login_ability(self): ...
```

#### 2. Logistics & Manager Dashboard Endpoints
**File:** `backend/views.py`
**Endpoints to test:**
- `GET /api/logistics/stores/` — list all stores with inventory %, status
- `GET /api/logistics/deliveries/` — list deliveries with route, driver, ETA
- `GET /api/logistics/supply-requests/` — list requests filtered by urgency/status
- `GET /api/manager/inventory/` — manager's regional inventory view
- `GET /api/manager/revenue/` — revenue breakdown by time period

**Test Class:** `LogisticsManagerEndpointTests`
```python
class LogisticsManagerEndpointTests(APITestCase):
    def test_logistics_manager_sees_only_their_hub_stores(self): ...
    def test_supply_request_urgency_sorting(self): ...
    def test_manager_cannot_access_logistics_endpoints(self): ...
    def test_revenue_aggregation_by_drink(self): ...
```

#### 3. Role-Based Access Control (RBAC)
**File:** `backend/permissions.py`
**Gaps:**
- No tests for `IsAdmin`, `IsLogisticsManager`, `IsRepairStaff`, `IsStore`, `IsStoreOrAdmin` permission classes
- No tests for role inheritance (e.g., super-admin can do what admin can do + more)

**Test Class:** `PermissionTests`
```python
class PermissionTests(APITestCase):
    def test_customer_user_denied_to_admin_endpoint(self): ...
    def test_repair_staff_can_update_machine_status(self): ...
    def test_logistics_manager_denied_from_repair_endpoints(self): ...
    def test_super_admin_bypasses_all_permission_checks(self): ...
```

#### 4. Machine Status State Machine
**File:** `backend/models.py` — `Machine.status` field, `update-status` endpoint
**Valid transitions:** 
```
NORMAL → WARNING → ERROR → OUT_OF_ORDER
                          → SCHEDULE_SERVICE → REPAIR_START → REPAIR_END → NORMAL
```

**Gaps:** No tests for invalid transitions (e.g., NORMAL → REPAIR_START directly, skipping SCHEDULE_SERVICE)

**Test Class:** `MachineStatusTests`
```python
class MachineStatusTests(TestCase):
    def test_machine_transitions_normal_to_warning(self): ...
    def test_machine_cannot_skip_to_repair_start(self): ...
    def test_repair_end_returns_to_normal(self): ...
    def test_invalid_transition_raises_validation_error(self): ...
```

#### 5. RecurringOrder Scheduling Logic
**File:** `backend/models.py` — `RecurringOrder` model fields: `interval`, `unit` (DAY/WEEK/MONTH), `days_of_week`, `end_type` (NEVER/AFTER_N_OCCURRENCES/ON_DATE), `end_date`
**Gaps:** No tests for schedule generation, overlap detection, cancellation logic

**Test Class:** `RecurringOrderTests`
```python
class RecurringOrderTests(TestCase):
    def test_recurring_order_every_weekday(self): ...
    def test_recurring_order_ends_after_10_occurrences(self): ...
    def test_recurring_order_ends_on_specific_date(self): ...
    def test_next_scheduled_order_calculation(self): ...
    def test_user_cannot_edit_completed_recurring_orders(self): ...
```

#### 6. Celery Background Tasks
**File:** `backend/tasks.py` — `cleanup_expired_visiting_cache()`, `retry_pending_profile_updates()`, heartbeat timeout logic
**Gaps:** Zero test coverage on async tasks

**Test Class:** `CeleryTaskTests`
```python
class CeleryTaskTests(TestCase):
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_cleanup_removes_expired_visiting_cache(self): ...
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_retry_increments_backoff_on_failure(self): ...
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_heartbeat_timeout_marks_store_unreachable(self): ...
```

#### 7. Stripe Integration
**File:** `backend/views.py` — `create-payment-intent`, `config/stripe` endpoints
**Gaps:** Endpoints exist but not tested; Stripe SDK not mocked

**Test Class:** `StripePaymentTests`
```python
class StripePaymentTests(APITestCase):
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_returns_client_secret(self, mock_create): ...
    
    @patch('stripe.PaymentIntent.create')
    def test_invalid_amount_raises_validation_error(self, mock_create): ...
    
    def test_stripe_config_returns_publishable_key(self): ...
```

### Tools & Setup
- **Framework:** `django.test.TestCase` (for DB tests), `rest_framework.test.APITestCase` (for API tests)
- **Mocking:** `unittest.mock.patch` for external APIs
- **Command:** `python manage.py test backend.tests.YourTestClass`
- **Add to CI:** Run daily or on every commit (see Nathan's section)

### Acceptance Criteria
- ✅ All view endpoints return expected status codes (200, 201, 403, 404, etc.)
- ✅ All model methods execute without exceptions
- ✅ Permission classes correctly allow/deny access
- ✅ External services (Stripe, Groq) return mocked, deterministic responses
- ✅ Coverage on backend code ≥ 80%

---

## Barrett: Unit Testing (Frontend)

### Goal
Verify that each React component, screen, and page logic works correctly in isolation. Test user interactions (button clicks, form inputs) without hitting the real API.

### Scope
- **Mobile App:** `codepop/src/pages/*.js`, `codepop/src/components/*.js`
- **Dashboard:** `dashboards_frontend/src/pages/*.jsx`, `dashboards_frontend/src/components/*`
- All form submission, validation, error handling, modal behavior
- Theme/styling edge cases (dark mode, responsive layouts)

### Setup Requirements

#### Mobile App (React Native + Expo)
**Directory:** `codepop/`

1. **Install Testing Framework**
   ```bash
   cd codepop
   npm install --save-dev jest @testing-library/react-native jest-expo expo-jest
   ```

2. **Create Jest Config** (if not exists)
   ```bash
   # File: codepop/jest.config.js
   module.exports = {
     preset: 'jest-expo',
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     testEnvironment: 'node',
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
   };
   ```

3. **Create Jest Setup File**
   ```bash
   # File: codepop/jest.setup.js
   # Mock AsyncStorage, react-native modules
   jest.mock('@react-native-async-storage/async-storage', () => ({
     getItem: jest.fn(),
     setItem: jest.fn(),
   }));
   ```

#### Dashboard Frontend (React + Vite)
**Directory:** `dashboards_frontend/`

1. **Install Testing Framework**
   ```bash
   cd dashboards_frontend
   npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
   ```

2. **Create Vitest Config**
   ```bash
   # File: dashboards_frontend/vitest.config.js
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./src/test/setup.js'],
     },
   });
   ```

### Components to Test (Examples)

#### Mobile App

**1. SeasonalCarousel.js**
```javascript
// File: codepop/src/components/__tests__/SeasonalCarousel.test.js
import { render, screen } from '@testing-library/react-native';
import SeasonalCarousel from '../SeasonalCarousel';

describe('SeasonalCarousel', () => {
  it('renders list of seasonal drinks', () => {
    const drinks = [{ id: 1, name: 'Spring Special' }];
    render(<SeasonalCarousel drinks={drinks} />);
    expect(screen.getByText('Spring Special')).toBeTruthy();
  });

  it('calls onSelectDrink when drink tapped', () => {
    const onSelect = jest.fn();
    render(<SeasonalCarousel drinks={[...]} onSelectDrink={onSelect} />);
    // simulate tap
    expect(onSelect).toHaveBeenCalled();
  });
});
```

**2. CartPage.js**
```javascript
// File: codepop/src/pages/__tests__/CartPage.test.js
describe('CartPage', () => {
  it('displays empty cart message when no items', () => {
    render(<CartPage cartItems={[]} />);
    expect(screen.getByText(/your cart is empty/i)).toBeTruthy();
  });

  it('calculates total price correctly', () => {
    const items = [
      { id: 1, price: 5.00, qty: 2 },
      { id: 2, price: 3.50, qty: 1 },
    ];
    render(<CartPage cartItems={items} />);
    expect(screen.getByText('$13.50')).toBeTruthy(); // 5*2 + 3.5*1
  });

  it('removes item from cart', () => {
    const onRemove = jest.fn();
    render(<CartPage cartItems={[...]} onRemoveItem={onRemove} />);
    // simulate delete button tap
    expect(onRemove).toHaveBeenCalledWith(expect.any(Object));
  });
});
```

**3. CheckoutForm.js**
```javascript
// File: codepop/src/pages/__tests__/CheckoutForm.test.js
describe('CheckoutForm', () => {
  it('validates email field', async () => {
    render(<CheckoutForm onSubmit={jest.fn()} />);
    const submit = screen.getByText('Confirm Order');
    fireEvent.press(submit);
    expect(screen.getByText(/invalid email/i)).toBeTruthy();
  });

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<CheckoutForm onSubmit={onSubmit} />);
    // fill fields
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

#### Dashboard Frontend

**1. LoginPage.jsx**
```javascript
// File: dashboards_frontend/src/pages/__tests__/LoginPage.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from '../LoginPage';

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('calls login API on form submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ token: 'abc123' });
    render(<LoginPage loginFn={mockLogin} />);
    // fill and submit
    expect(mockLogin).toHaveBeenCalled();
  });

  it('displays error message on login failure', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginPage loginFn={mockLogin} />);
    // submit form
    expect(screen.getByText(/invalid credentials/i)).toBeTruthy();
  });
});
```

**2. ManagerInventoryPage.jsx**
```javascript
// File: dashboards_frontend/src/pages/manager/__tests__/InventoryPage.test.jsx
describe('ManagerInventoryPage', () => {
  it('displays inventory items in a table', () => {
    const inventory = [
      { id: 1, name: 'Cola Syrup', quantity: 100 },
      { id: 2, name: 'Lime Syrup', quantity: 50 },
    ];
    render(<ManagerInventoryPage inventory={inventory} />);
    expect(screen.getByText('Cola Syrup')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('opens supply request modal on button click', () => {
    render(<ManagerInventoryPage inventory={[...]} />);
    fireEvent.click(screen.getByText(/request supply/i));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
```

### Commands
```bash
# Mobile app
npm test                      # run all tests
npm test -- --coverage        # with coverage report
npm test -- --watch           # watch mode

# Dashboard
npm run test                  # same structure with Vitest
npm run test -- --coverage
npm run test -- --watch
```

### Acceptance Criteria
- ✅ All major components have unit tests
- ✅ User interactions (clicks, form input) work as expected
- ✅ Error messages display correctly
- ✅ All validations trigger appropriately
- ✅ Coverage ≥ 70% for both mobile and dashboard
- ✅ Tests pass in CI on every commit

---

## Jordan: Integration Testing

### Goal
Verify that multiple components work together correctly. Test API endpoints hitting a real test database, async tasks with queues, and external services.

### Scope
- **API ↔ Database:** Full request/response cycle through Django views to PostgreSQL
- **Auth Flow:** Register → login → token generation → protected endpoints
- **Order Lifecycle:** Create → add drinks → payment → status updates
- **Celery ↔ Redis:** Background tasks execute and modify database correctly
- **External APIs:** Stripe, Groq (mocked but tested with realistic payloads)
- **Distributed System:** Visiting user lookup, profile sync across stores

### Test File Location
**Extend:** `codepop_backend/backend/tests.py` or create `codepop_backend/backend/tests_integration.py`

### Integration Test Classes

#### 1. Auth Flow Integration
```python
class AuthFlowIntegrationTests(APITestCase):
    """Test registration, login, and token-protected endpoints together."""
    
    def test_register_user_then_login_then_access_protected_endpoint(self):
        # Register
        response = self.client.post('/backend/auth/register/', {
            'username': 'newuser',
            'password': 'SecurePass123!',
            'email': 'user@example.com',
        })
        self.assertEqual(response.status_code, 201)
        
        # Login
        response = self.client.post('/backend/auth/login/', {
            'username': 'newuser',
            'password': 'SecurePass123!',
        })
        self.assertEqual(response.status_code, 200)
        token = response.data['token']
        
        # Access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        response = self.client.get('/backend/users/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'newuser')
    
    def test_cannot_access_protected_endpoint_without_token(self):
        response = self.client.get('/backend/users/me/')
        self.assertEqual(response.status_code, 401)
```

#### 2. Order Lifecycle Integration
```python
class OrderLifecycleIntegrationTests(APITestCase):
    """Test creating an order, adding drinks, and checkout flow."""
    
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'pass')
        self.client.force_authenticate(user=self.user)
    
    def test_create_order_add_drinks_create_payment_intent(self):
        # Create order
        order_response = self.client.post('/backend/orders/', {})
        self.assertEqual(order_response.status_code, 201)
        order_id = order_response.data['id']
        
        # Create a drink
        drink_response = self.client.post('/backend/drinks/', {
            'name': 'Custom Cola',
            'size': 'M',
            'ice': 'Regular',
            'price': 4.50,
        })
        drink_id = drink_response.data['id']
        
        # Add drink to order
        add_response = self.client.post(f'/backend/orders/{order_id}/add_drink/', {
            'drink_id': drink_id,
        })
        self.assertEqual(add_response.status_code, 200)
        
        # Create payment intent
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = {
                'id': 'pi_test123',
                'client_secret': 'secret_abc',
            }
            payment_response = self.client.post('/backend/create-payment-intent/', {
                'order_id': order_id,
                'amount': 450,  # cents
            })
            self.assertEqual(payment_response.status_code, 200)
            self.assertIn('client_secret', payment_response.data)
```

#### 3. Celery Task Integration
```python
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class CeleryIntegrationTests(TestCase):
    """Test async tasks that modify database."""
    
    def test_cleanup_expired_visiting_cache(self):
        from django.utils import timezone
        from backend.models import VisitingUserCache
        from backend.tasks import cleanup_expired_visiting_cache
        
        # Create an expired cache entry (> 24 hours old)
        user = User.objects.create_user('visitor', 'v@test.com', 'pass')
        old_entry = VisitingUserCache.objects.create(
            user=user,
            created_at=timezone.now() - timedelta(hours=25),
        )
        
        # Run cleanup task
        cleanup_expired_visiting_cache()
        
        # Verify old entry removed
        self.assertFalse(VisitingUserCache.objects.filter(id=old_entry.id).exists())
    
    def test_retry_pending_profile_updates_with_backoff(self):
        from backend.models import PendingProfileUpdate
        from backend.tasks import retry_pending_profile_updates
        
        user = User.objects.create_user('user', 'u@test.com', 'pass')
        update = PendingProfileUpdate.objects.create(
            user=user,
            retry_count=0,
            next_retry=timezone.now() - timedelta(seconds=1),  # due for retry
        )
        
        with patch('requests.post') as mock_post:
            mock_post.side_effect = ConnectionError('Home store unreachable')
            retry_pending_profile_updates()
        
        update.refresh_from_db()
        self.assertEqual(update.retry_count, 1)
        # next_retry should be exponentially backed off
        self.assertGreater(update.next_retry, timezone.now())
```

#### 4. Visiting User Flow (Distributed)
```python
class VisitingUserDistributedIntegrationTests(APITestCase):
    """Test multi-store login flow."""
    
    @patch('requests.post')  # Mock inter-node HTTP calls
    def test_user_login_at_non_home_store(self, mock_post):
        # Setup: user's home store is in Logan, user logs in at Atlanta store
        user = User.objects.create_user('traveler', 'traveler@test.com', 'pass')
        atlanta_store = StoreRegistry.objects.create(
            name='Atlanta Store',
            region='Atlanta',
            is_hub=True,
        )
        
        # Mock hub's response with encrypted user profile
        mock_post.return_value.json.return_value = {
            'profile': 'encrypted_bytes',
            'status': 'found',
        }
        
        # Authenticate as Atlanta store node
        self.client.credentials(HTTP_X_STORE_ID=str(atlanta_store.id))
        
        # Login at non-home store
        response = self.client.post('/backend/auth/login/', {
            'username': 'traveler',
            'password': 'pass',
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Verify VisitingUserCache created
        cache = VisitingUserCache.objects.filter(user=user).first()
        self.assertIsNotNone(cache)
        self.assertEqual(cache.store, atlanta_store)
```

#### 5. Stripe Payment Integration
```python
class StripePaymentIntegrationTests(APITestCase):
    """Test Stripe payment flow end-to-end."""
    
    def setUp(self):
        self.user = User.objects.create_user('buyer', 'buyer@test.com', 'pass')
        self.client.force_authenticate(user=self.user)
    
    @patch('stripe.PaymentIntent.create')
    def test_payment_intent_flow(self, mock_create):
        # Create order with drinks
        order = Order.objects.create(user=self.user)
        drink = Drink.objects.create(name='Premium Mix', price=6.99)
        order.drinks.add(drink)
        
        # Mock Stripe response
        mock_create.return_value = {
            'id': 'pi_test123',
            'client_secret': 'secret_test',
            'amount': 699,
            'status': 'requires_payment_method',
        }
        
        # Call endpoint
        response = self.client.post('/backend/create-payment-intent/', {
            'order_id': order.id,
            'amount': 699,
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('client_secret', response.data)
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        self.assertEqual(call_args['amount'], 699)
```

#### 6. Groq AI Integration
```python
class GroqAIIntegrationTests(APITestCase):
    """Test chatbot and drink generator with mocked Groq API."""
    
    def setUp(self):
        self.user = User.objects.create_user('customer', 'cust@test.com', 'pass')
        self.client.force_authenticate(user=self.user)
    
    @patch('anthropic.Anthropic.messages.create')  # Groq uses Anthropic SDK format
    def test_chatbot_endpoint_calls_groq(self, mock_groq):
        mock_groq.return_value.content = [
            type('obj', (), {'text': 'Try our spring lime special!'})()
        ]
        
        response = self.client.post('/backend/chatbot/', {
            'message': 'What should I try?',
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('spring lime special', response.data['reply'])
    
    @patch('anthropic.Anthropic.messages.create')
    def test_drink_generator_calls_groq(self, mock_groq):
        mock_groq.return_value.content = [
            type('obj', (), {'text': '{"name": "Tropical Paradise", "syrup": "pineapple", "ice": "crushed"}'})()
        ]
        
        response = self.client.get('/backend/generate/', {
            'preference': 'tropical',
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Tropical Paradise')
```

### Tools
- **Framework:** Django `APITestCase` (spins up transactional test DB automatically)
- **Mocking:** `unittest.mock.patch`, `responses`, `requests_mock`
- **Async:** `@override_settings(CELERY_TASK_ALWAYS_EAGER=True)` to run tasks synchronously in tests
- **External APIs:** Mock HTTP responses; don't hit real Stripe/Groq during tests
- **Database:** Each test runs in a transaction that rolls back automatically

### Acceptance Criteria
- ✅ Multi-step workflows (register → login → order → payment) work end-to-end
- ✅ Database state changes propagate correctly through API layers
- ✅ Celery tasks execute and modify data as expected
- ✅ External API calls are mocked and tested with realistic payloads
- ✅ Distributed system flows (visiting user, inter-node sync) work correctly
- ✅ All integration tests pass on CI

---

## Nathan: Regression Testing

### Goal
Ensure that fixes and new features don't break existing functionality. Maintain a safety net via automated testing, enforce coverage standards, and catch regressions early.

### Responsibilities

#### 1. Set Up GitHub Actions CI Pipeline
**File:** `.github/workflows/test.yml` (create at repo root)

```yaml
name: Run Tests

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: codepop_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:8
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd codepop_backend
        pip install -r requirements.txt
        pip install coverage
    
    - name: Run backend unit + integration tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/codepop_test
        REDIS_URL: redis://localhost:6379
        SECRET_KEY: test-secret-key
      run: |
        cd codepop_backend
        python manage.py test backend --verbosity 2
        coverage report --fail-under=70
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./codepop_backend/.coverage
        fail_ci_if_error: true

  frontend-mobile-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd codepop
        npm ci
    
    - name: Run mobile unit tests
      run: |
        cd codepop
        npm run test -- --coverage --ci
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./codepop/coverage/coverage-final.json

  frontend-dashboard-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd dashboards_frontend
        npm ci
    
    - name: Run dashboard tests
      run: |
        cd dashboards_frontend
        npm run test -- --coverage --run
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./dashboards_frontend/coverage/coverage-final.json

  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Lint Python (flake8)
      run: |
        pip install flake8
        cd codepop_backend
        flake8 backend --max-line-length=100 --exclude=migrations
```

#### 2. Coverage Thresholds & Gates

**Backend (`codepop_backend/`):**
- **Minimum:** 70% line coverage
- **Target:** 80% for critical modules (models, views, permissions)
- **Tools:** `coverage.py` + `--fail-under=70` flag

**Frontend (Mobile + Dashboard):**
- **Minimum:** 60% for components, 70% for pages
- **Target:** 80% overall

**Configuration files:**
```python
# codepop_backend/.coveragerc
[run]
source = backend
omit = 
    */migrations/*
    */tests.py
    manage.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
```

#### 3. Regression Test Suite (Post-Bug-Fix Workflow)

**When a bug is reported and fixed:**

1. **Before merging the fix**, write a test that reproduces the original bug
2. **Verify the test fails** with the original code
3. **Apply the fix** and verify the test passes
4. **Add the test to** `codepop_backend/backend/tests.py` (for backend bugs)

**Example:**
```python
# Bug: Seasonal drinks displayed incorrectly when marked inactive
class RegressionSeasonalDrinkInactiveTests(APITestCase):
    def test_inactive_seasonal_drink_hidden_from_carousel(self):
        """Regression: issue #123 — inactive drinks still appeared in carousel."""
        SeasonalDrink.objects.create(name='Spring Special', is_active=False)
        
        response = self.client.get('/backend/seasonal-drinks/')
        # Should only return active drinks
        self.assertEqual(len(response.data), 0)
    
    def test_active_seasonal_drink_visible(self):
        """Verify the fix: active drinks show correctly."""
        SeasonalDrink.objects.create(name='Spring Special', is_active=True)
        
        response = self.client.get('/backend/seasonal-drinks/')
        self.assertEqual(len(response.data), 1)
```

#### 4. Pre-Merge Checklist (For Code Review)

**Before approving any PR:**
- [ ] CI pipeline passed (all tests, coverage gates)
- [ ] New code has unit tests
- [ ] Integration tests added for new features
- [ ] Coverage did not decrease
- [ ] No previously passing tests were disabled/skipped
- [ ] Regression test added if fixing a bug
- [ ] Linting passed

#### 5. Monitor & Report

**Weekly tasks:**
- Check coverage trends (should stay ≥ 70%)
- Review flaky tests (tests that fail intermittently)
- Run full suite locally to catch environment issues
- Update test documentation as new features are added

### Tools
- **Test Runners:** Django test framework, pytest, Jest, Vitest
- **Coverage:** `coverage.py`, `nyc` (JavaScript)
- **CI:** GitHub Actions (free, integrated with repo)
- **Linting:** flake8 (Python), ESLint (JavaScript)
- **Code Quality:** Codecov.io (optional, free for public repos)

### Acceptance Criteria
- ✅ CI pipeline runs on every push and PR
- ✅ Tests must pass before merge to master
- ✅ Coverage maintains ≥ 70% (fail if drops below)
- ✅ Zero test skips without documented reason
- ✅ Regression tests written for all bug fixes
- ✅ Weekly coverage report generated and reviewed

---

## Braden: System Testing & Acceptance Testing

### Goal
Validate the entire system works as intended for real users. Test complete workflows, real devices/browsers, and non-functional requirements (performance, reliability).

### Scope

#### System Testing (E2E Automation)
Full end-to-end workflows on a running system (Docker Compose stack).

#### Acceptance Testing (Manual UAT)
Walk through user stories, test on real devices, verify all requirements met.

### System Testing (E2E) Scenarios

#### Scenario 1: Customer Purchase Flow
**Title:** End-to-end order from signup to completion

**Precondition:** Docker Compose stack running
```bash
cd codepop_backend
docker-compose up -d
```

**Steps:**
1. Open mobile app (Expo) or web dashboard
2. Sign up: email, password, flavor preferences
3. Browse seasonal drinks carousel
4. Tap "Customize" → build a drink (select syrups, add-ins, size)
5. Add to cart
6. Go to cart, verify total price
7. Proceed to checkout
8. Enter payment details (Stripe test card: `4242 4242 4242 4242`)
9. Confirm order
10. Receive order confirmation (check email, push notification)
11. Check order status in "My Orders"

**Expected Result:**
- Order created in database with status `pending`
- Payment intent succeeded
- Locker combo displayed to customer
- Notification sent
- Revenue record created

**Test Automation (Detox for mobile):**
```bash
# Install Detox
npm install --save-dev detox-cli detox detox-test-utils

# File: codepop/e2e/firstTest.e2e.js
describe('Customer Purchase Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete a full purchase', async () => {
    // Sign up
    await element(by.id('signupEmail')).typeText('buyer@test.com');
    await element(by.id('signupPassword')).typeText('SecurePass123!');
    await element(by.id('signupButton')).multiTap();
    
    // Browse carousel
    await waitFor(element(by.text('Spring Special'))).toBeVisible();
    
    // Add to cart
    await element(by.id('addToCartButton')).multiTap();
    
    // Checkout
    await element(by.id('checkoutButton')).multiTap();
    await element(by.id('paymentSubmit')).multiTap();
    
    // Verify confirmation
    await expect(element(by.text(/order confirmed/i))).toBeVisible();
  });
});
```

**Dashboard Automation (Playwright):**
```bash
npm init playwright
```

```javascript
// dashboards_frontend/e2e/manager-flow.spec.js
import { test, expect } from '@playwright/test';

test('Manager views inventory and submits supply request', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="email"]', 'manager@test.com');
  await page.fill('[name="password"]', 'ManagerPass123!');
  await page.click('button:has-text("Login")');
  
  // Wait for redirect
  await page.waitForURL('/dashboard/manager/inventory');
  
  // Check inventory table loads
  const table = page.locator('table');
  await expect(table).toBeVisible();
  
  // Submit supply request
  await page.click('button:has-text("Request Supply")');
  await page.fill('[name="quantity"]', '50');
  await page.selectOption('[name="urgency"]', 'critical');
  await page.click('button:has-text("Submit")');
  
  // Verify submission
  await expect(page.locator('text=Request submitted')).toBeVisible();
});
```

#### Scenario 2: Visiting User Login (Distributed Flow)
**Title:** User logs in at non-home store

**Setup:**
- 2 Docker Compose stacks: one in Logan (home), one in Atlanta (remote)
- Network them so they can communicate

**Steps:**
1. User's profile exists in Logan store database
2. Open mobile app, configure to connect to Atlanta store
3. Login with user credentials
4. Verify Atlanta store hits Logan hub for profile
5. VisitingUserCache populated
6. Browse and order drinks (using cached profile)
7. Update profile (name change)
8. Verify update queued in PendingProfileUpdate
9. "Go back" to home store (simulate travel)
10. Verify profile update syncs

**Tools:** Playwright for web, Detox for mobile, custom Python script to simulate inter-node traffic

#### Scenario 3: Admin Role-Based Access
**Title:** Verify permission levels work across all dashboards

**Steps:**
1. Login as Admin
   - Can view users, audit logs, permissions
   - Cannot access logistics/repair views
2. Logout, login as Logistics Manager
   - Can view stores, deliveries, supply requests
   - Cannot access admin user management
3. Logout, login as Repair Staff
   - Can view machine status and schedules
   - Cannot access inventory or user management

**Assertion:** Each role sees only relevant dashboard sections; protected endpoints return 403 if unauthorized

### Acceptance Testing (Manual)

**User Story Walkthrough Template:**

| Feature | Story | Steps | Expected | Actual | Pass? |
|---------|-------|-------|----------|--------|-------|
| Drink Customization | As a customer, I want to build a custom drink | 1. Tap "Create" 2. Select syrup 3. Add add-ins 4. Choose size 5. Confirm | Drink added to cart with all selections | | ✓ |
| Seasonal Carousel | As a customer, I want to see limited-time drinks | 1. Open app 2. See carousel 3. Tap seasonal drink | Drink details show with "Seasonal" label | | ✓ |
| Recurring Orders | As a customer, I want to schedule repeat orders | 1. Place order 2. Tap "Make Recurring" 3. Set interval (weekly) 4. Save | Order repeats every week automatically | | ✓ |
| Inventory Alert | As a manager, I want to be notified of low stock | 1. Item below threshold 2. Check notifications 3. See alert | Red flag on inventory item, notification sent | | ✓ |
| Machine Repair Flow | As repair staff, I want to mark machines under service | 1. Select machine 2. Change status to SCHEDULE_SERVICE 3. Assign staff 4. Mark REPAIR_START 5. Mark REPAIR_END | Status transitions correctly; manager sees "Under Repair" label | | ✓ |

**Non-Functional Requirements:**

| Requirement | Test | Expected | Actual | Pass? |
|-------------|------|----------|--------|-------|
| Page Load Time | Open app, measure load time | < 3 seconds for main pages | | ✓ |
| Payment Reliability | Complete 5 test purchases | All succeed without error | | ✓ |
| Offline Resilience | Disable network mid-order | App gracefully queues; syncs when reconnected | | ✓ |
| Multi-language | Switch app language to Spanish | All UI text translates | | ✓ |
| Device Compatibility | Test on iOS and Android | App works on both platforms | | ✓ |

### Test Devices & Environments

**Mobile:**
- Physical iPhone (latest, iOS 18+)
- Physical Android (latest, Android 14+)
- Expo Go (development)
- Simulator/Emulator (backup)

**Dashboard:**
- Chrome (latest, Linux/Mac/Windows)
- Safari (Mac)
- Firefox (backup)

**Backend:**
- Docker Compose stack (PostgreSQL + Redis + Django)
- Test environment variables set (no prod data)

### Sign-Off Checklist

Before release to production:
- [ ] All system test scenarios pass
- [ ] All acceptance test stories pass
- [ ] No critical bugs found
- [ ] Performance meets non-functional requirements
- [ ] Documentation updated (user guides, API docs)
- [ ] Stakeholder approval obtained

### Tools
- **Mobile E2E:** Detox (Expo-compatible), Expo Go (manual)
- **Web E2E:** Playwright, Selenium
- **Performance:** Lighthouse (built into Chrome), WebPageTest
- **API Monitoring:** Postman (manual), Insomnia
- **Documentation:** Markdown, Jira, Confluence

### Acceptance Criteria
- ✅ All system workflows run end-to-end without errors
- ✅ All user stories validated on real devices/browsers
- ✅ Non-functional requirements met (load time, reliability, etc.)
- ✅ No regressions vs. previous release
- ✅ UAT sign-off from stakeholders
- ✅ Deployment checklist complete

---

## Quick Reference: Tools by Testing Level

| Level | Framework | Language | Key Tools |
|-------|-----------|----------|-----------|
| **Unit (Backend)** | Django TestCase, APITestCase | Python | unittest.mock, coverage.py |
| **Unit (Frontend)** | Jest, Vitest | JavaScript | @testing-library/react, react-native |
| **Integration** | Django APITestCase | Python | responses, httpretty, mocking |
| **Regression** | All above | Python + JS | GitHub Actions, coverage gates, Codecov |
| **System/E2E** | Detox, Playwright | JavaScript | Docker Compose, real devices/browsers |
| **Acceptance** | Manual + tools | All | Jira, sign-off sheets, checklists |

---

## Workflow Summary

### Daily Development
1. **Dev** writes code
2. **Unit Tester (Brayden)** writes unit tests → PR feedback
3. **Dev** fixes and pushes
4. **CI (Nathan)** runs automated tests → blocks merge if fails
5. **Integration Tester (Jordan)** manual review of test coverage
6. **Merge** to master

### Weekly
1. **Regression Tester (Nathan)** reviews coverage trends
2. **System Tester (Braden)** runs E2E scenarios on latest build
3. **Team** discusses failing tests, regressions

### Before Release
1. **All tests** pass in CI
2. **Coverage** ≥ 70%
3. **System tests** all green
4. **Acceptance tests** all stories validated
5. **Sign-off** from Braden + stakeholder

---

## Contacts & Escalation

| Role | Responsibility | Contact |
|------|-----------------|---------|
| Brayden (Backend Unit) | Django views, models, permissions | Slack: #testing-backend |
| Barrett (Frontend Unit) | React components, pages | Slack: #testing-frontend |
| Jordan (Integration) | Cross-layer flows, external APIs | Slack: #testing-integration |
| Nathan (Regression) | CI, coverage, regression suite | Slack: #testing-regression |
| Braden 5 (System) | E2E, UAT, manual testing | Slack: #testing-system |

**Issues?** Open a GitHub issue in the CodePop repo with label `testing` and tag the relevant member.

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-08  
**Maintained By:** Testing Team
