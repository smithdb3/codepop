# Phase 3: Supply Hub & Logistics System (Weeks 7-9)

**Project**: CodePop P2P Distributed System
**Phase Duration**: 3 weeks
**Team Size**: 5 developers
**Dependencies**: Phase 0 (P2P Infrastructure), Phase 1 (Multi-Store), Phase 2 (Roles)

---

## Phase Overview

Implement the complete supply request workflow, including store-to-hub communication, supply hub inventory management, delivery routing, and AI-powered usage forecasting. This phase enables stores to request supplies from regional hubs, logistics managers to approve/coordinate deliveries, and the system to predict future supply needs using CSV-based pattern analysis.

### Goals
- ✅ Create SupplyRequest model and workflow
- ✅ Implement supply hub inventory management
- ✅ Build CSV upload for usage pattern analysis
- ✅ Implement AI-powered usage forecasting (scikit-learn)
- ✅ Create approval/denial workflow for logistics managers
- ✅ Support inter-region deliveries (within 1000 miles)
- ✅ Build mobile screens for managers to request supplies
- ✅ Build web interface for logistics managers
- ✅ Implement hub-and-spoke P2P communication

### Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│               Supply Hub (Region C)                 │
│  - Hub Inventory Database                           │
│  - Delivery Scheduling Engine                       │
│  - AI Usage Forecasting Module                      │
│  - Logistics Manager Dashboard                      │
└──────────┬──────────────┬──────────────┬───────────┘
           │              │              │
    P2P Communication     │              │
           │              │              │
  ┌────────▼────┐  ┌─────▼─────┐  ┌────▼──────┐
  │ Store A     │  │ Store B   │  │ Store C   │
  │ Requests    │  │ Requests  │  │ Requests  │
  │ Supplies    │  │ Supplies  │  │ Supplies  │
  └─────────────┘  └───────────┘  └───────────┘
```

---

## Task 3.1: SupplyRequest Model & Store Request API

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1

### Requirements
Stores need to submit supply requests to their assigned supply hub. The system must track the lifecycle of each request from submission through delivery.

---

### Test Specifications (Write First!)

Create `backend/tests/test_supply_requests.py`:

```python
class SupplyRequestTests(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create region and hub
        self.region = Region.objects.create(
            region_code='C',
            name='Logan, UT',
            center_latitude=41.7370,
            center_longitude=-111.8338
        )

        self.hub = SupplyHub.objects.create(
            region=self.region,
            name='Logan UT Supply Hub',
            latitude=41.7370,
            longitude=-111.8338,
            api_base_url='http://localhost:8000',
            street_address='123 Hub St',
            city='Logan',
            state='UT',
            zip_code='84321'
        )

        # Create store
        self.store = Store.objects.create(
            store_number='LOGAN-001',
            name='Logan Main Street',
            region=self.region,
            supply_hub=self.hub,
            latitude=41.7370,
            longitude=-111.8338,
            api_base_url='http://localhost:8001',
            street_address='456 Main St',
            city='Logan',
            state='UT',
            zip_code='84321'
        )

        # Create manager user
        self.manager = User.objects.create_user(
            username='manager1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.manager,
            role_type='MANAGER',
            store=self.store
        )

        self.client.force_authenticate(user=self.manager)

    def test_manager_can_create_supply_request(self):
        """Test manager can submit supply request"""
        response = self.client.post(
            f'/backend/stores/{self.store.store_id}/supply-requests/',
            {
                'items': [
                    {'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10},
                    {'item_name': 'Vanilla Syrup', 'item_type': 'Syrups', 'quantity': 5}
                ],
                'urgency': 'NORMAL',
                'notes': 'Regular restock'
            },
            format='json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(SupplyRequest.objects.count(), 1)

    def test_supply_request_defaults_to_pending(self):
        """Test new requests start in pending status"""
        request = SupplyRequest.objects.create(
            store=self.store,
            supply_hub=self.hub,
            requested_by=self.manager,
            urgency='NORMAL'
        )
        self.assertEqual(request.status, 'PENDING')

    def test_manager_can_view_store_requests(self):
        """Test manager can view their store's requests"""
        # Create request
        request = SupplyRequest.objects.create(
            store=self.store,
            supply_hub=self.hub,
            requested_by=self.manager,
            urgency='URGENT'
        )

        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/supply-requests/'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['urgency'], 'URGENT')

    def test_manager_cannot_view_other_store_requests(self):
        """Test manager denied access to other stores"""
        other_store = Store.objects.create(
            store_number='LOGAN-002',
            name='Logan Store 2',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        response = self.client.get(
            f'/backend/stores/{other_store.store_id}/supply-requests/'
        )
        self.assertEqual(response.status_code, 403)

    def test_request_includes_item_details(self):
        """Test request stores all item details"""
        request = SupplyRequest.objects.create(
            store=self.store,
            supply_hub=self.hub,
            requested_by=self.manager,
            items=[
                {'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10, 'current_quantity': 2}
            ]
        )

        self.assertEqual(len(request.items), 1)
        self.assertEqual(request.items[0]['item_name'], 'Cherry Syrup')
        self.assertEqual(request.items[0]['quantity'], 10)

    def test_urgent_requests_flagged(self):
        """Test urgent requests have priority flag"""
        urgent_request = SupplyRequest.objects.create(
            store=self.store,
            supply_hub=self.hub,
            requested_by=self.manager,
            urgency='URGENT'
        )

        normal_request = SupplyRequest.objects.create(
            store=self.store,
            supply_hub=self.hub,
            requested_by=self.manager,
            urgency='NORMAL'
        )

        # Urgent requests should appear first when sorted
        requests = SupplyRequest.objects.filter(store=self.store).order_by('-urgency', 'created_at')
        self.assertEqual(requests.first().id, urgent_request.id)

    def test_request_notifies_supply_hub(self):
        """Test request sends P2P event to hub"""
        with patch('backend.tasks.send_event_to_peers.delay') as mock_send:
            response = self.client.post(
                f'/backend/stores/{self.store.store_id}/supply-requests/',
                {
                    'items': [{'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10}],
                    'urgency': 'NORMAL'
                },
                format='json'
            )

            mock_send.assert_called_once()
            call_args = mock_send.call_args[1]
            self.assertEqual(call_args['event_type'], 'SUPPLY_REQUEST_CREATED')
```

---

### Backend Implementation

**1. Create SupplyRequest Model** (`backend/models.py`):

```python
class SupplyRequest(models.Model):
    """Request for supplies from store to supply hub"""
    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Relationships
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='supply_requests')
    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.PROTECT, related_name='supply_requests')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='supply_requests')

    # Status workflow
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('DENIED', 'Denied'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Urgency level
    URGENCY_CHOICES = [
        ('LOW', 'Low Priority'),
        ('NORMAL', 'Normal Priority'),
        ('URGENT', 'Urgent'),
        ('CRITICAL', 'Critical - Out of Stock'),
    ]
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='NORMAL')

    # Items requested (JSON array)
    items = models.JSONField()
    # Example: [
    #   {"item_name": "Cherry Syrup", "item_type": "Syrups", "quantity": 10, "current_quantity": 2},
    #   {"item_name": "Cola Base", "item_type": "Sodas", "quantity": 5, "current_quantity": 0}
    # ]

    # Notes from store manager
    notes = models.TextField(blank=True)

    # Logistics manager response
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_supply_requests'
    )
    review_notes = models.TextField(blank=True)

    # Delivery information
    estimated_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    delivery_tracking_number = models.CharField(max_length=100, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-urgency', '-created_at']
        indexes = [
            models.Index(fields=['store', 'status']),
            models.Index(fields=['supply_hub', 'status']),
            models.Index(fields=['status', 'urgency']),
        ]

    def __str__(self):
        return f"Request {self.request_id} - {self.store.name} → {self.supply_hub.name} ({self.status})"

    def total_items(self):
        """Calculate total number of items requested"""
        return sum(item['quantity'] for item in self.items)

    def is_overdue(self):
        """Check if request is overdue based on urgency"""
        if self.status in ['DELIVERED', 'DENIED', 'CANCELLED']:
            return False

        from django.utils import timezone
        from datetime import timedelta

        age = timezone.now() - self.created_at

        if self.urgency == 'CRITICAL' and age > timedelta(days=1):
            return True
        elif self.urgency == 'URGENT' and age > timedelta(days=3):
            return True
        elif self.urgency == 'NORMAL' and age > timedelta(days=7):
            return True

        return False


class SupplyDelivery(models.Model):
    """Tracks physical delivery of supplies"""
    delivery_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    supply_request = models.ForeignKey(
        SupplyRequest,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )

    # Route information
    origin_hub = models.ForeignKey(
        SupplyHub,
        on_delete=models.PROTECT,
        related_name='outgoing_deliveries'
    )
    destination_store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        related_name='incoming_deliveries'
    )

    # Multi-stop deliveries (if combining multiple requests)
    delivery_stops = models.JSONField(default=list)
    # Example: [
    #   {"store_id": "uuid", "store_name": "Store A", "stop_number": 1},
    #   {"store_id": "uuid", "store_name": "Store B", "stop_number": 2}
    # ]

    # Delivery details
    driver_name = models.CharField(max_length=100, blank=True)
    vehicle_id = models.CharField(max_length=50, blank=True)
    estimated_distance_miles = models.FloatField(null=True)
    estimated_duration_minutes = models.IntegerField(null=True)

    # Status
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_TRANSIT', 'In Transit'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')

    # Timestamps
    scheduled_date = models.DateTimeField()
    departed_at = models.DateTimeField(null=True, blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-scheduled_date']

    def __str__(self):
        return f"Delivery {self.delivery_id} - {self.origin_hub.name} → {self.destination_store.name}"
```

**2. Create Store Request API** (`backend/views.py`):

```python
class StoreSupplyRequestView(APIView):
    """Store managers submit and view supply requests"""
    permission_classes = [IsAuthenticated, IsStoreManager | IsSuperAdmin]

    def get(self, request, store_id):
        """
        GET /backend/stores/<store_id>/supply-requests/

        Returns list of supply requests for this store
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify manager has access to this store
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=store,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get requests, newest first
        requests = SupplyRequest.objects.filter(store=store)

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            requests = requests.filter(status=status_filter)

        serializer = SupplyRequestSerializer(requests, many=True)
        return Response(serializer.data)

    def post(self, request, store_id):
        """
        POST /backend/stores/<store_id>/supply-requests/
        {
            "items": [
                {"item_name": "Cherry Syrup", "item_type": "Syrups", "quantity": 10, "current_quantity": 2},
                {"item_name": "Vanilla Syrup", "item_type": "Syrups", "quantity": 5, "current_quantity": 8}
            ],
            "urgency": "NORMAL",  # or URGENT, CRITICAL, LOW
            "notes": "Regular weekly restock"
        }

        Creates a new supply request
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=store,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Validate items
        items = request.data.get('items', [])
        if not items:
            return Response(
                {'error': 'At least one item must be requested'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate each item has required fields
        for item in items:
            if not all(key in item for key in ['item_name', 'item_type', 'quantity']):
                return Response(
                    {'error': 'Each item must have item_name, item_type, and quantity'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create request
        supply_request = SupplyRequest.objects.create(
            store=store,
            supply_hub=store.supply_hub,
            requested_by=request.user,
            items=items,
            urgency=request.data.get('urgency', 'NORMAL'),
            notes=request.data.get('notes', '')
        )

        # Notify supply hub via P2P event
        node_config = NodeConfig.objects.first()
        send_event_to_peers.delay(
            event_type='SUPPLY_REQUEST_CREATED',
            payload={
                'request_id': str(supply_request.request_id),
                'store_id': str(store.store_id),
                'store_name': store.name,
                'hub_id': str(store.supply_hub.hub_id),
                'urgency': supply_request.urgency,
                'total_items': supply_request.total_items(),
                'items': items,
            },
            target_node_id=store.supply_hub.node_id
        )

        serializer = SupplyRequestSerializer(supply_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SupplyRequestDetailView(APIView):
    """View and cancel specific supply request"""
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        """
        GET /backend/supply-requests/<request_id>/

        Returns details of a specific supply request
        """
        try:
            supply_request = SupplyRequest.objects.get(request_id=request_id)
        except SupplyRequest.DoesNotExist:
            return Response(
                {'error': 'Request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify user has access (store manager or logistics manager)
        has_access = (
            is_super_admin(request.user) or
            UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=supply_request.store,
                is_active=True
            ).exists() or
            UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                region=supply_request.store.region,
                is_active=True
            ).exists()
        )

        if not has_access:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SupplyRequestSerializer(supply_request)
        return Response(serializer.data)

    def patch(self, request, request_id):
        """
        PATCH /backend/supply-requests/<request_id>/
        {
            "status": "CANCELLED",
            "notes": "No longer needed"
        }

        Cancel a supply request (managers only, before approval)
        """
        try:
            supply_request = SupplyRequest.objects.get(request_id=request_id)
        except SupplyRequest.DoesNotExist:
            return Response(
                {'error': 'Request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only store managers can cancel their own requests
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=supply_request.store,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Can only cancel pending or approved requests
        if supply_request.status not in ['PENDING', 'APPROVED']:
            return Response(
                {'error': f'Cannot cancel request in {supply_request.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        supply_request.status = 'CANCELLED'
        if 'notes' in request.data:
            supply_request.notes += f"\n[CANCELLED] {request.data['notes']}"
        supply_request.save()

        # Notify supply hub
        send_event_to_peers.delay(
            event_type='SUPPLY_REQUEST_CANCELLED',
            payload={
                'request_id': str(supply_request.request_id),
                'store_name': supply_request.store.name,
            },
            target_node_id=supply_request.supply_hub.node_id
        )

        serializer = SupplyRequestSerializer(supply_request)
        return Response(serializer.data)
```

**3. Create Serializers** (`backend/serializers.py`):

```python
class SupplyRequestSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    hub_name = serializers.CharField(source='supply_hub.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = SupplyRequest
        fields = '__all__'


class SupplyDeliverySerializer(serializers.ModelSerializer):
    origin_hub_name = serializers.CharField(source='origin_hub.name', read_only=True)
    destination_store_name = serializers.CharField(source='destination_store.name', read_only=True)

    class Meta:
        model = SupplyDelivery
        fields = '__all__'
```

**4. Add URL Patterns** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Supply Requests
    path('stores/<uuid:store_id>/supply-requests/', StoreSupplyRequestView.as_view()),
    path('supply-requests/<uuid:request_id>/', SupplyRequestDetailView.as_view()),
]
```

---

### Testing Strategy

**Backend Tests**:
```bash
python manage.py test backend.tests.test_supply_requests
```

**Manual Testing**:
- [ ] Create supply request as manager
- [ ] Verify request appears in dashboard
- [ ] Check P2P event sent to hub
- [ ] Cancel request before approval
- [ ] Attempt to access other store's requests (should fail)
- [ ] View request details
- [ ] Verify urgency sorting

---

### Documentation Required

**Update `docs/SUPPLY_SYSTEM.md`**:
```markdown
# Supply Request System

## Overview
Stores can request supplies from their assigned supply hub. Requests are tracked through their entire lifecycle.

## API Endpoints

### Create Supply Request
POST /backend/stores/<store_id>/supply-requests/

### List Store Requests
GET /backend/stores/<store_id>/supply-requests/?status=PENDING

### View Request Detail
GET /backend/supply-requests/<request_id>/

### Cancel Request
PATCH /backend/supply-requests/<request_id>/
{
  "status": "CANCELLED",
  "notes": "Reason for cancellation"
}

## Request Lifecycle
1. PENDING - Awaiting review by logistics manager
2. APPROVED - Approved, delivery scheduled
3. IN_TRANSIT - Delivery in progress
4. DELIVERED - Received at store
5. DENIED - Request denied
6. CANCELLED - Cancelled by store manager

## Urgency Levels
- CRITICAL: Out of stock, needs immediate attention (<24h)
- URGENT: Low stock, needs attention within 3 days
- NORMAL: Regular restock, needs attention within 7 days
- LOW: Pre-emptive restock, no urgency

## Item Format
```json
{
  "item_name": "Cherry Syrup",
  "item_type": "Syrups",
  "quantity": 10,
  "current_quantity": 2
}
```
```

---

### Success Criteria

✅ Store managers can create supply requests
✅ Requests tracked with all required metadata
✅ P2P events notify supply hubs
✅ Managers can view and cancel requests
✅ Permission checks prevent unauthorized access
✅ Urgency levels affect request sorting
✅ All tests pass with >80% coverage

---

## Task 3.2: Supply Hub Inventory & Approval Workflow

**Priority**: MUST HAVE (M)
**Estimated Effort**: 4-5 days
**Assigned To**: Backend Developer 2 + Frontend Developer 1

### Requirements
Supply hubs need their own inventory tracking, and logistics managers need to approve/deny supply requests and schedule deliveries.

---

### Test Specifications (Write First!)

Create `backend/tests/test_hub_inventory.py`:

```python
class HubInventoryTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(
            region=self.region,
            name='Logan UT Supply Hub',
            # ... other fields
        )

        self.logistics_user = User.objects.create_user(
            username='logistics1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.logistics_user,
            role_type='LOGISTICS_MANAGER',
            region=self.region,
            supply_hub=self.hub
        )

        self.client.force_authenticate(user=self.logistics_user)

    def test_hub_has_inventory(self):
        """Test supply hub can have inventory"""
        inventory = HubInventory.objects.create(
            supply_hub=self.hub,
            ItemName='Cherry Syrup',
            ItemType='Syrups',
            Quantity=1000,
            ThresholdLevel=200
        )
        self.assertEqual(inventory.supply_hub, self.hub)

    def test_logistics_manager_can_view_hub_inventory(self):
        """Test logistics manager can view their hub's inventory"""
        HubInventory.objects.create(
            supply_hub=self.hub,
            ItemName='Cherry Syrup',
            ItemType='Syrups',
            Quantity=1000
        )

        response = self.client.get(
            f'/backend/hubs/{self.hub.hub_id}/inventory/'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_logistics_manager_can_approve_request(self):
        """Test logistics manager can approve supply request"""
        store = Store.objects.create(
            store_number='LOGAN-001',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        request = SupplyRequest.objects.create(
            store=store,
            supply_hub=self.hub,
            requested_by=self.logistics_user,
            items=[{'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10}],
            urgency='NORMAL'
        )

        response = self.client.post(
            f'/backend/supply-requests/{request.request_id}/approve/',
            {
                'estimated_delivery_date': '2026-02-10',
                'review_notes': 'Approved for next delivery run'
            }
        )

        self.assertEqual(response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, 'APPROVED')
        self.assertEqual(request.reviewed_by, self.logistics_user)

    def test_logistics_manager_can_deny_request(self):
        """Test logistics manager can deny supply request"""
        store = Store.objects.create(
            store_number='LOGAN-001',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        request = SupplyRequest.objects.create(
            store=store,
            supply_hub=self.hub,
            requested_by=self.logistics_user,
            items=[{'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10}],
            urgency='NORMAL'
        )

        response = self.client.post(
            f'/backend/supply-requests/{request.request_id}/deny/',
            {
                'review_notes': 'Item out of stock at hub'
            }
        )

        self.assertEqual(response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, 'DENIED')

    def test_approval_reduces_hub_inventory(self):
        """Test approving request reduces hub inventory"""
        # Create hub inventory
        hub_inventory = HubInventory.objects.create(
            supply_hub=self.hub,
            ItemName='Cherry Syrup',
            ItemType='Syrups',
            Quantity=100
        )

        store = Store.objects.create(
            store_number='LOGAN-001',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        request = SupplyRequest.objects.create(
            store=store,
            supply_hub=self.hub,
            requested_by=self.logistics_user,
            items=[{'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10}],
            urgency='NORMAL'
        )

        response = self.client.post(
            f'/backend/supply-requests/{request.request_id}/approve/',
            {'estimated_delivery_date': '2026-02-10'}
        )

        hub_inventory.refresh_from_db()
        self.assertEqual(hub_inventory.Quantity, 90)  # 100 - 10

    def test_cannot_approve_if_insufficient_hub_inventory(self):
        """Test approval fails if hub doesn't have enough inventory"""
        hub_inventory = HubInventory.objects.create(
            supply_hub=self.hub,
            ItemName='Cherry Syrup',
            ItemType='Syrups',
            Quantity=5  # Less than requested
        )

        store = Store.objects.create(
            store_number='LOGAN-001',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        request = SupplyRequest.objects.create(
            store=store,
            supply_hub=self.hub,
            requested_by=self.logistics_user,
            items=[{'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10}],
            urgency='NORMAL'
        )

        response = self.client.post(
            f'/backend/supply-requests/{request.request_id}/approve/',
            {'estimated_delivery_date': '2026-02-10'}
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('insufficient inventory', response.data['error'].lower())
```

---

### Backend Implementation

**1. Create HubInventory Model** (`backend/models.py`):

```python
class HubInventory(models.Model):
    """Inventory at supply hubs (separate from store inventory)"""
    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, related_name='inventory')

    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50, choices=[
        ('Syrups', 'Syrups'),
        ('Sodas', 'Sodas'),
        ('Add-ins', 'Add-ins'),
        ('Physical', 'Physical Items'),
    ])
    Quantity = models.IntegerField()
    ThresholdLevel = models.IntegerField(default=500)  # Hubs have higher thresholds

    # Pricing (hubs may have different costs)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    last_restocked = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['supply_hub', 'ItemName', 'ItemType']
        ordering = ['supply_hub', 'ItemType', 'ItemName']
        verbose_name_plural = 'Hub Inventory'

    def __str__(self):
        return f"{self.supply_hub.name} - {self.ItemName} ({self.Quantity})"

    def is_low_stock(self):
        """Check if hub inventory is below threshold"""
        return self.Quantity <= self.ThresholdLevel
```

**2. Create Approval/Denial API** (`backend/views.py`):

```python
class SupplyRequestApprovalView(APIView):
    """Logistics managers approve/deny supply requests"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def post(self, request, request_id):
        """
        POST /backend/supply-requests/<request_id>/approve/
        {
            "estimated_delivery_date": "2026-02-10",
            "review_notes": "Approved for next delivery run",
            "delivery_stops": [...]  # Optional multi-stop route
        }

        Approve a supply request and schedule delivery
        """
        try:
            supply_request = SupplyRequest.objects.get(request_id=request_id)
        except SupplyRequest.DoesNotExist:
            return Response(
                {'error': 'Request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify logistics manager has access to this hub
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=supply_request.supply_hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Can only approve pending requests
        if supply_request.status != 'PENDING':
            return Response(
                {'error': f'Cannot approve request in {supply_request.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if hub has sufficient inventory for all items
        insufficient_items = []
        for item in supply_request.items:
            try:
                hub_inventory = HubInventory.objects.get(
                    supply_hub=supply_request.supply_hub,
                    ItemName=item['item_name'],
                    ItemType=item['item_type']
                )

                if hub_inventory.Quantity < item['quantity']:
                    insufficient_items.append({
                        'item_name': item['item_name'],
                        'requested': item['quantity'],
                        'available': hub_inventory.Quantity
                    })
            except HubInventory.DoesNotExist:
                insufficient_items.append({
                    'item_name': item['item_name'],
                    'requested': item['quantity'],
                    'available': 0
                })

        if insufficient_items:
            return Response(
                {
                    'error': 'Insufficient inventory at hub',
                    'insufficient_items': insufficient_items
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reduce hub inventory (reserve for delivery)
        for item in supply_request.items:
            hub_inventory = HubInventory.objects.get(
                supply_hub=supply_request.supply_hub,
                ItemName=item['item_name'],
                ItemType=item['item_type']
            )
            hub_inventory.Quantity -= item['quantity']
            hub_inventory.save()

        # Update request status
        supply_request.status = 'APPROVED'
        supply_request.reviewed_by = request.user
        supply_request.approved_at = timezone.now()
        supply_request.estimated_delivery_date = request.data.get('estimated_delivery_date')
        supply_request.review_notes = request.data.get('review_notes', '')
        supply_request.save()

        # Create delivery record
        delivery = SupplyDelivery.objects.create(
            supply_request=supply_request,
            origin_hub=supply_request.supply_hub,
            destination_store=supply_request.store,
            scheduled_date=request.data.get('estimated_delivery_date'),
            delivery_stops=request.data.get('delivery_stops', [])
        )

        # Notify store via P2P event
        send_event_to_peers.delay(
            event_type='SUPPLY_REQUEST_APPROVED',
            payload={
                'request_id': str(supply_request.request_id),
                'store_name': supply_request.store.name,
                'estimated_delivery': str(supply_request.estimated_delivery_date),
                'items': supply_request.items,
            },
            target_node_id=supply_request.store.node_id
        )

        return Response({
            'request': SupplyRequestSerializer(supply_request).data,
            'delivery': SupplyDeliverySerializer(delivery).data,
        })


class SupplyRequestDenialView(APIView):
    """Deny supply request"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def post(self, request, request_id):
        """
        POST /backend/supply-requests/<request_id>/deny/
        {
            "review_notes": "Insufficient inventory at hub"
        }

        Deny a supply request
        """
        try:
            supply_request = SupplyRequest.objects.get(request_id=request_id)
        except SupplyRequest.DoesNotExist:
            return Response(
                {'error': 'Request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=supply_request.supply_hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if supply_request.status != 'PENDING':
            return Response(
                {'error': f'Cannot deny request in {supply_request.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        supply_request.status = 'DENIED'
        supply_request.reviewed_by = request.user
        supply_request.review_notes = request.data.get('review_notes', 'Denied by logistics manager')
        supply_request.save()

        # Notify store
        send_event_to_peers.delay(
            event_type='SUPPLY_REQUEST_DENIED',
            payload={
                'request_id': str(supply_request.request_id),
                'store_name': supply_request.store.name,
                'reason': supply_request.review_notes,
            },
            target_node_id=supply_request.store.node_id
        )

        serializer = SupplyRequestSerializer(supply_request)
        return Response(serializer.data)


class HubInventoryView(APIView):
    """Manage supply hub inventory"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def get(self, request, hub_id):
        """
        GET /backend/hubs/<hub_id>/inventory/?low_stock=true

        Returns hub inventory
        """
        try:
            hub = SupplyHub.objects.get(hub_id=hub_id)
        except SupplyHub.DoesNotExist:
            return Response(
                {'error': 'Hub not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        inventory = HubInventory.objects.filter(supply_hub=hub)

        # Filter by low stock if requested
        if request.query_params.get('low_stock') == 'true':
            inventory = inventory.filter(Quantity__lte=F('ThresholdLevel'))

        serializer = HubInventorySerializer(inventory, many=True)
        return Response(serializer.data)

    def post(self, request, hub_id):
        """
        POST /backend/hubs/<hub_id>/inventory/
        {
            "ItemName": "Cherry Syrup",
            "ItemType": "Syrups",
            "Quantity": 1000,
            "ThresholdLevel": 200,
            "unit_cost": 5.99
        }

        Add or update hub inventory item
        """
        try:
            hub = SupplyHub.objects.get(hub_id=hub_id)
        except SupplyHub.DoesNotExist:
            return Response(
                {'error': 'Hub not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        item_name = request.data.get('ItemName')
        item_type = request.data.get('ItemType')

        # Update or create
        inventory, created = HubInventory.objects.update_or_create(
            supply_hub=hub,
            ItemName=item_name,
            ItemType=item_type,
            defaults={
                'Quantity': request.data.get('Quantity'),
                'ThresholdLevel': request.data.get('ThresholdLevel', 500),
                'unit_cost': request.data.get('unit_cost'),
                'last_restocked': timezone.now(),
            }
        )

        serializer = HubInventorySerializer(inventory)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
```

**3. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Hub Inventory
    path('hubs/<uuid:hub_id>/inventory/', HubInventoryView.as_view()),

    # Supply Request Approval/Denial
    path('supply-requests/<uuid:request_id>/approve/', SupplyRequestApprovalView.as_view()),
    path('supply-requests/<uuid:request_id>/deny/', SupplyRequestDenialView.as_view()),
]
```

---

### Frontend Implementation (Mobile - Manager View)

**Create Supply Request Screen** (`codepop/src/pages/SupplyRequestScreen.js`):

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../ip_address';

export default function SupplyRequestScreen({ navigation, route }) {
  const { storeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [urgency, setUrgency] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadInventory(), loadRequests()]);
    setLoading(false);
  };

  const loadInventory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/stores/${storeId}/inventory/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/stores/${storeId}/supply-requests/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const toggleItemSelection = (item) => {
    const existing = selectedItems.find(
      (i) => i.ItemName === item.ItemName && i.ItemType === item.ItemType
    );

    if (existing) {
      setSelectedItems(selectedItems.filter((i) => i !== existing));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          item_name: item.ItemName,
          item_type: item.ItemType,
          quantity: 10, // Default quantity
          current_quantity: item.Quantity,
        },
      ]);
    }
  };

  const updateItemQuantity = (index, quantity) => {
    const updated = [...selectedItems];
    updated[index].quantity = parseInt(quantity) || 0;
    setSelectedItems(updated);
  };

  const submitRequest = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/stores/${storeId}/supply-requests/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: selectedItems,
            urgency: urgency,
            notes: notes,
          }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Supply request submitted');
        setShowRequestModal(false);
        setSelectedItems([]);
        setNotes('');
        loadRequests();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#FFA686',
      'APPROVED': '#8df1d3',
      'IN_TRANSIT': '#C6C8EE',
      'DELIVERED': '#8df1d3',
      'DENIED': '#D30C7B',
      'CANCELLED': '#666',
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C6C8EE" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Supply Requests</Text>
        <TouchableOpacity
          style={styles.newRequestButton}
          onPress={() => setShowRequestModal(true)}
        >
          <Text style={styles.newRequestButtonText}>+ New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Active Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Requests</Text>
        {requests
          .filter((r) => ['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(r.status))
          .map((request) => (
            <TouchableOpacity
              key={request.request_id}
              style={styles.requestCard}
              onPress={() =>
                navigation.navigate('SupplyRequestDetail', {
                  requestId: request.request_id,
                })
              }
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestId}>
                  #{request.request_id.slice(0, 8)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>
              <Text style={styles.requestDate}>
                {new Date(request.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.requestItems}>
                {request.total_items} items requested
              </Text>
              {request.urgency !== 'NORMAL' && (
                <Text style={styles.urgencyBadge}>
                  ⚠️ {request.urgency}
                </Text>
              )}
            </TouchableOpacity>
          ))}
      </View>

      {/* Past Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Past Requests</Text>
        {requests
          .filter((r) => ['DELIVERED', 'DENIED', 'CANCELLED'].includes(r.status))
          .slice(0, 10)
          .map((request) => (
            <TouchableOpacity
              key={request.request_id}
              style={styles.requestCard}
              onPress={() =>
                navigation.navigate('SupplyRequestDetail', {
                  requestId: request.request_id,
                })
              }
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestId}>
                  #{request.request_id.slice(0, 8)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>
              <Text style={styles.requestDate}>
                {new Date(request.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* New Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Supply Request</Text>
            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Urgency Selector */}
            <Text style={styles.label}>Urgency</Text>
            <View style={styles.urgencyButtons}>
              {['LOW', 'NORMAL', 'URGENT', 'CRITICAL'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyButton,
                    urgency === level && styles.urgencyButtonActive,
                  ]}
                  onPress={() => setUrgency(level)}
                >
                  <Text
                    style={[
                      styles.urgencyButtonText,
                      urgency === level && styles.urgencyButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Item Selection */}
            <Text style={styles.label}>Select Items</Text>
            {inventory.map((item, index) => {
              const isSelected = selectedItems.find(
                (i) => i.item_name === item.ItemName && i.item_type === item.ItemType
              );
              const selectedIndex = selectedItems.findIndex(
                (i) => i.item_name === item.ItemName && i.item_type === item.ItemType
              );

              return (
                <View key={index} style={styles.itemRow}>
                  <TouchableOpacity
                    style={[
                      styles.itemCheckbox,
                      isSelected && styles.itemCheckboxActive,
                    ]}
                    onPress={() => toggleItemSelection(item)}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.ItemName}</Text>
                    <Text style={styles.itemStock}>
                      Current: {item.Quantity}
                    </Text>
                  </View>
                  {isSelected && (
                    <TextInput
                      style={styles.quantityInput}
                      keyboardType="numeric"
                      value={String(selectedItems[selectedIndex].quantity)}
                      onChangeText={(text) =>
                        updateItemQuantity(selectedIndex, text)
                      }
                      placeholder="Qty"
                    />
                  )}
                </View>
              );
            })}

            {/* Notes */}
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details for logistics manager..."
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitRequest}
            >
              <Text style={styles.submitButtonText}>
                Submit Request ({selectedItems.length} items)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newRequestButton: {
    backgroundColor: '#C6C8EE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newRequestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  requestCard: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#C6C8EE',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  requestItems: {
    fontSize: 14,
    color: '#333',
  },
  urgencyBadge: {
    marginTop: 8,
    fontSize: 12,
    color: '#D30C7B',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  urgencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  urgencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  urgencyButtonActive: {
    backgroundColor: '#C6C8EE',
    borderColor: '#C6C8EE',
  },
  urgencyButtonText: {
    color: '#666',
    fontSize: 12,
  },
  urgencyButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C6C8EE',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCheckboxActive: {
    backgroundColor: '#C6C8EE',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemStock: {
    fontSize: 12,
    color: '#666',
  },
  quantityInput: {
    width: 60,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#C6C8EE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

### Success Criteria

✅ Supply hubs have separate inventory tracking
✅ Logistics managers can approve supply requests
✅ Logistics managers can deny requests with notes
✅ Approval reduces hub inventory appropriately
✅ System prevents approval if insufficient hub stock
✅ Store managers notified of approval/denial via P2P
✅ Mobile interface allows easy request creation
✅ All tests pass with >80% coverage

---

## Task 3.3: CSV Upload & AI Usage Forecasting

**Priority**: MUST HAVE (M)
**Estimated Effort**: 4-5 days
**Assigned To**: Backend Developer 3 + Data Scientist

### Requirements
Logistics managers upload CSV files with historical usage data. AI analyzes patterns to forecast future supply needs and suggest optimal restock schedules.

---

### Test Specifications (Write First!)

Create `backend/tests/test_usage_forecasting.py`:

```python
import pandas as pd
from django.core.files.uploadedfile import SimpleUploadedFile
from backend.models import UsageData, UsageForecast

class UsageForecastingTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(
            region=self.region,
            name='Logan UT Supply Hub',
            # ... other fields
        )

        self.logistics_user = User.objects.create_user(
            username='logistics1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.logistics_user,
            role_type='LOGISTICS_MANAGER',
            region=self.region,
            supply_hub=self.hub
        )

        self.client.force_authenticate(user=self.logistics_user)

    def test_csv_upload_creates_usage_data(self):
        """Test CSV upload parses and stores usage data"""
        csv_content = b"""date,store_id,item_name,item_type,quantity_used
2026-01-01,LOGAN-001,Cherry Syrup,Syrups,15
2026-01-02,LOGAN-001,Cherry Syrup,Syrups,18
2026-01-03,LOGAN-001,Cherry Syrup,Syrups,12
"""
        csv_file = SimpleUploadedFile(
            "usage_data.csv",
            csv_content,
            content_type="text/csv"
        )

        response = self.client.post(
            f'/backend/hubs/{self.hub.hub_id}/usage-data/upload/',
            {'file': csv_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(UsageData.objects.count(), 3)

    def test_invalid_csv_format_rejected(self):
        """Test invalid CSV format returns error"""
        csv_content = b"""invalid,headers
data,here
"""
        csv_file = SimpleUploadedFile(
            "bad_data.csv",
            csv_content,
            content_type="text/csv"
        )

        response = self.client.post(
            f'/backend/hubs/{self.hub.hub_id}/usage-data/upload/',
            {'file': csv_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('invalid', response.data['error'].lower())

    def test_ai_generates_forecast(self):
        """Test AI generates usage forecast from data"""
        # Create historical usage data
        for day in range(30):
            UsageData.objects.create(
                supply_hub=self.hub,
                store_number='LOGAN-001',
                date=timezone.now().date() - timedelta(days=30-day),
                item_name='Cherry Syrup',
                item_type='Syrups',
                quantity_used=15 + (day % 7)  # Weekly pattern
            )

        response = self.client.post(
            f'/backend/hubs/{self.hub.hub_id}/usage-data/forecast/',
            {
                'item_name': 'Cherry Syrup',
                'item_type': 'Syrups',
                'forecast_days': 7
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('forecast', response.data)
        self.assertEqual(len(response.data['forecast']), 7)

    def test_forecast_identifies_weekly_pattern(self):
        """Test AI identifies weekly usage patterns"""
        # Create data with clear weekly pattern (high on weekends)
        for week in range(4):
            for day in range(7):
                quantity = 30 if day in [5, 6] else 15  # Weekend spike
                UsageData.objects.create(
                    supply_hub=self.hub,
                    store_number='LOGAN-001',
                    date=timezone.now().date() - timedelta(days=28-(week*7+day)),
                    item_name='Cherry Syrup',
                    item_type='Syrups',
                    quantity_used=quantity
                )

        response = self.client.post(
            f'/backend/hubs/{self.hub.hub_id}/usage-data/forecast/',
            {
                'item_name': 'Cherry Syrup',
                'item_type': 'Syrups',
                'forecast_days': 7
            }
        )

        # Check forecast identifies higher usage on days 5 and 6
        forecast = response.data['forecast']
        self.assertGreater(forecast[5]['predicted_quantity'], forecast[1]['predicted_quantity'])
        self.assertGreater(forecast[6]['predicted_quantity'], forecast[1]['predicted_quantity'])

    def test_forecast_suggests_restock_timing(self):
        """Test AI suggests optimal restock dates"""
        # Create usage data
        for day in range(30):
            UsageData.objects.create(
                supply_hub=self.hub,
                store_number='LOGAN-001',
                date=timezone.now().date() - timedelta(days=30-day),
                item_name='Cherry Syrup',
                item_type='Syrups',
                quantity_used=20
            )

        response = self.client.post(
            f'/backend/hubs/{self.hub.hub_id}/usage-data/restock-schedule/',
            {
                'item_name': 'Cherry Syrup',
                'item_type': 'Syrups',
                'current_quantity': 100,
                'restock_quantity': 200
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('restock_date', response.data)
        self.assertIn('days_until_stockout', response.data)
```

---

### Backend Implementation

**1. Create UsageData Model** (`backend/models.py`):

```python
class UsageData(models.Model):
    """Historical usage data for AI analysis"""
    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, related_name='usage_data')

    # Store information
    store_number = models.CharField(max_length=50)
    region_code = models.CharField(max_length=10)

    # Date of usage
    date = models.DateField()

    # Item details
    item_name = models.CharField(max_length=100)
    item_type = models.CharField(max_length=50)
    quantity_used = models.IntegerField()

    # Additional context
    day_of_week = models.CharField(max_length=10)  # Monday, Tuesday, etc.
    week_of_year = models.IntegerField()
    month = models.IntegerField()

    # Metadata
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['supply_hub', 'item_name', 'date']),
            models.Index(fields=['store_number', 'date']),
        ]

    def __str__(self):
        return f"{self.store_number} - {self.item_name} ({self.date}): {self.quantity_used}"


class UsageForecast(models.Model):
    """AI-generated usage forecasts"""
    forecast_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, related_name='forecasts')

    # Forecast details
    item_name = models.CharField(max_length=100)
    item_type = models.CharField(max_length=50)

    # Forecast data (JSON array)
    forecast_data = models.JSONField()
    # Example: [
    #   {"date": "2026-02-10", "predicted_quantity": 18.5, "confidence": 0.85},
    #   {"date": "2026-02-11", "predicted_quantity": 15.2, "confidence": 0.82}
    # ]

    # Patterns identified
    patterns = models.JSONField(default=dict)
    # Example: {
    #   "weekly_pattern": true,
    #   "peak_days": ["saturday", "sunday"],
    #   "average_daily_usage": 17.3,
    #   "trend": "increasing"
    # }

    # Restock recommendations
    recommended_restock_date = models.DateField(null=True, blank=True)
    recommended_quantity = models.IntegerField(null=True, blank=True)

    # Model metadata
    model_accuracy = models.FloatField(null=True)  # R² score or similar
    data_points_used = models.IntegerField()

    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"Forecast: {self.item_name} for {self.supply_hub.name}"
```

**2. Create CSV Upload API** (`backend/views.py`):

```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta

class UsageDataUploadView(APIView):
    """Upload CSV file with historical usage data"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, hub_id):
        """
        POST /backend/hubs/<hub_id>/usage-data/upload/

        Upload CSV file with columns:
        - date (YYYY-MM-DD)
        - store_id (store number)
        - item_name
        - item_type
        - quantity_used
        """
        try:
            hub = SupplyHub.objects.get(hub_id=hub_id)
        except SupplyHub.DoesNotExist:
            return Response(
                {'error': 'Hub not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get uploaded file
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be CSV format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse CSV with pandas
            df = pd.read_csv(csv_file)

            # Validate required columns
            required_columns = ['date', 'store_id', 'item_name', 'item_type', 'quantity_used']
            if not all(col in df.columns for col in required_columns):
                return Response(
                    {
                        'error': 'Invalid CSV format',
                        'required_columns': required_columns,
                        'provided_columns': list(df.columns)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse dates
            df['date'] = pd.to_datetime(df['date'])

            # Add derived fields
            df['day_of_week'] = df['date'].dt.day_name()
            df['week_of_year'] = df['date'].dt.isocalendar().week
            df['month'] = df['date'].dt.month

            # Create UsageData records
            records_created = 0
            for _, row in df.iterrows():
                UsageData.objects.update_or_create(
                    supply_hub=hub,
                    store_number=row['store_id'],
                    date=row['date'].date(),
                    item_name=row['item_name'],
                    item_type=row['item_type'],
                    defaults={
                        'quantity_used': row['quantity_used'],
                        'day_of_week': row['day_of_week'],
                        'week_of_year': row['week_of_year'],
                        'month': row['month'],
                        'region_code': hub.region.region_code,
                        'uploaded_by': request.user,
                    }
                )
                records_created += 1

            return Response({
                'message': 'Usage data uploaded successfully',
                'records_created': records_created,
                'date_range': {
                    'start': str(df['date'].min().date()),
                    'end': str(df['date'].max().date())
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to parse CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UsageForecastView(APIView):
    """Generate AI-powered usage forecast"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def post(self, request, hub_id):
        """
        POST /backend/hubs/<hub_id>/usage-data/forecast/
        {
            "item_name": "Cherry Syrup",
            "item_type": "Syrups",
            "forecast_days": 14,
            "store_number": "LOGAN-001"  // Optional, for store-specific forecast
        }

        Generate usage forecast using AI
        """
        try:
            hub = SupplyHub.objects.get(hub_id=hub_id)
        except SupplyHub.DoesNotExist:
            return Response(
                {'error': 'Hub not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                supply_hub=hub,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        item_name = request.data.get('item_name')
        item_type = request.data.get('item_type')
        forecast_days = int(request.data.get('forecast_days', 7))
        store_number = request.data.get('store_number')  # Optional

        # Get historical data
        usage_queryset = UsageData.objects.filter(
            supply_hub=hub,
            item_name=item_name,
            item_type=item_type
        )

        if store_number:
            usage_queryset = usage_queryset.filter(store_number=store_number)

        if usage_queryset.count() < 7:
            return Response(
                {'error': 'Insufficient data for forecast (need at least 7 days)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert to pandas DataFrame
        usage_data = list(usage_queryset.values(
            'date', 'quantity_used', 'day_of_week', 'week_of_year', 'month'
        ))
        df = pd.DataFrame(usage_data)
        df = df.sort_values('date')

        # Generate forecast using AI
        forecast_result = self.generate_forecast(df, forecast_days)

        # Save forecast to database
        forecast_record = UsageForecast.objects.create(
            supply_hub=hub,
            item_name=item_name,
            item_type=item_type,
            forecast_data=forecast_result['forecast'],
            patterns=forecast_result['patterns'],
            model_accuracy=forecast_result['accuracy'],
            data_points_used=len(df),
            generated_by=request.user
        )

        return Response({
            'forecast_id': str(forecast_record.forecast_id),
            'forecast': forecast_result['forecast'],
            'patterns': forecast_result['patterns'],
            'accuracy': forecast_result['accuracy'],
            'recommendations': forecast_result['recommendations']
        })

    def generate_forecast(self, df, forecast_days):
        """
        Generate usage forecast using machine learning

        Uses linear regression with day-of-week encoding for pattern recognition
        """
        # Feature engineering
        df['day_num'] = pd.to_datetime(df['date']).dt.dayofweek
        df['days_from_start'] = (pd.to_datetime(df['date']) - pd.to_datetime(df['date']).min()).dt.days

        # Create day-of-week one-hot encoding
        day_dummies = pd.get_dummies(df['day_of_week'], prefix='day')
        df = pd.concat([df, day_dummies], axis=1)

        # Prepare features for model
        feature_columns = ['days_from_start'] + [col for col in df.columns if col.startswith('day_')]
        X = df[feature_columns].values
        y = df['quantity_used'].values

        # Train model
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = LinearRegression()
        model.fit(X_scaled, y)

        # Calculate model accuracy
        predictions = model.predict(X_scaled)
        from sklearn.metrics import r2_score
        accuracy = r2_score(y, predictions)

        # Identify patterns
        patterns = self.identify_patterns(df)

        # Generate future predictions
        forecast = []
        last_date = pd.to_datetime(df['date'].max())

        for i in range(1, forecast_days + 1):
            future_date = last_date + timedelta(days=i)
            day_name = future_date.strftime('%A')

            # Create feature vector for future date
            future_features = [df['days_from_start'].max() + i]
            for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
                future_features.append(1 if day == day_name else 0)

            # Predict
            future_X = scaler.transform([future_features])
            predicted_quantity = model.predict(future_X)[0]

            # Ensure positive prediction
            predicted_quantity = max(0, predicted_quantity)

            forecast.append({
                'date': future_date.strftime('%Y-%m-%d'),
                'day_of_week': day_name,
                'predicted_quantity': round(predicted_quantity, 1),
                'confidence': round(accuracy, 2)
            })

        # Generate recommendations
        recommendations = self.generate_recommendations(df, forecast, patterns)

        return {
            'forecast': forecast,
            'patterns': patterns,
            'accuracy': round(accuracy, 2),
            'recommendations': recommendations
        }

    def identify_patterns(self, df):
        """Identify usage patterns in historical data"""
        # Calculate average usage by day of week
        day_avg = df.groupby('day_of_week')['quantity_used'].mean().to_dict()

        # Overall statistics
        overall_avg = df['quantity_used'].mean()
        overall_std = df['quantity_used'].std()

        # Identify peak days (above average + 0.5 std)
        threshold = overall_avg + 0.5 * overall_std
        peak_days = [day for day, avg in day_avg.items() if avg > threshold]

        # Identify trend (increasing/decreasing/stable)
        recent_avg = df.tail(7)['quantity_used'].mean()
        older_avg = df.head(7)['quantity_used'].mean()

        if recent_avg > older_avg * 1.1:
            trend = 'increasing'
        elif recent_avg < older_avg * 0.9:
            trend = 'decreasing'
        else:
            trend = 'stable'

        return {
            'average_daily_usage': round(overall_avg, 1),
            'usage_variability': round(overall_std, 1),
            'day_of_week_pattern': {day: round(avg, 1) for day, avg in day_avg.items()},
            'peak_days': peak_days,
            'trend': trend,
            'weekly_pattern': len(peak_days) > 0
        }

    def generate_recommendations(self, historical_df, forecast, patterns):
        """Generate actionable recommendations based on forecast"""
        total_predicted_usage = sum(f['predicted_quantity'] for f in forecast)
        avg_daily = patterns['average_daily_usage']

        recommendations = []

        # Recommendation 1: Restock timing
        if patterns['trend'] == 'increasing':
            recommendations.append({
                'type': 'restock',
                'priority': 'high',
                'message': f'Usage trending upward. Consider increasing restock quantities by 20%.'
            })

        # Recommendation 2: Peak day preparation
        if patterns['peak_days']:
            peak_usage = sum(
                f['predicted_quantity']
                for f in forecast
                if f['day_of_week'] in patterns['peak_days']
            )
            recommendations.append({
                'type': 'peak_prep',
                'priority': 'medium',
                'message': f'Peak days ({", ".join(patterns["peak_days"])}) account for {round(peak_usage/total_predicted_usage*100)}% of predicted usage. Ensure adequate stock.'
            })

        # Recommendation 3: Total forecast summary
        recommendations.append({
            'type': 'summary',
            'priority': 'info',
            'message': f'Total predicted usage for next {len(forecast)} days: {round(total_predicted_usage)} units (avg {round(total_predicted_usage/len(forecast), 1)}/day)'
        })

        return recommendations


class RestockScheduleView(APIView):
    """Calculate optimal restock schedule"""
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def post(self, request, hub_id):
        """
        POST /backend/hubs/<hub_id>/usage-data/restock-schedule/
        {
            "item_name": "Cherry Syrup",
            "item_type": "Syrups",
            "current_quantity": 100,
            "restock_quantity": 200,
            "store_number": "LOGAN-001"  // Optional
        }

        Calculate when to restock based on usage forecast
        """
        try:
            hub = SupplyHub.objects.get(hub_id=hub_id)
        except SupplyHub.DoesNotExist:
            return Response(
                {'error': 'Hub not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        item_name = request.data.get('item_name')
        item_type = request.data.get('item_type')
        current_quantity = float(request.data.get('current_quantity', 0))
        restock_quantity = float(request.data.get('restock_quantity', 100))
        store_number = request.data.get('store_number')

        # Get recent forecast or generate new one
        try:
            forecast = UsageForecast.objects.filter(
                supply_hub=hub,
                item_name=item_name,
                item_type=item_type,
                generated_at__gte=timezone.now() - timedelta(days=1)
            ).latest('generated_at')

            forecast_data = forecast.forecast_data
        except UsageForecast.DoesNotExist:
            # Generate new forecast
            forecast_view = UsageForecastView()
            forecast_response = forecast_view.post(
                request._request,
                hub_id
            )
            forecast_data = forecast_response.data['forecast']

        # Calculate stockout date
        remaining = current_quantity
        stockout_day = None

        for i, day_forecast in enumerate(forecast_data):
            remaining -= day_forecast['predicted_quantity']
            if remaining <= 0:
                stockout_day = i
                break

        if stockout_day is None:
            stockout_day = len(forecast_data)

        # Calculate optimal restock date (2 days before stockout)
        restock_day = max(0, stockout_day - 2)
        restock_date = (
            timezone.now().date() + timedelta(days=restock_day)
        ).isoformat()

        return Response({
            'item_name': item_name,
            'current_quantity': current_quantity,
            'recommended_restock_quantity': restock_quantity,
            'restock_date': restock_date,
            'days_until_restock': restock_day,
            'days_until_stockout': stockout_day,
            'average_daily_usage': round(
                sum(f['predicted_quantity'] for f in forecast_data) / len(forecast_data),
                1
            )
        })
```

**3. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Usage Data & Forecasting
    path('hubs/<uuid:hub_id>/usage-data/upload/', UsageDataUploadView.as_view()),
    path('hubs/<uuid:hub_id>/usage-data/forecast/', UsageForecastView.as_view()),
    path('hubs/<uuid:hub_id>/usage-data/restock-schedule/', RestockScheduleView.as_view()),
]
```

**4. Create CSV Template** (`docs/usage_data_template.csv`):

```csv
date,store_id,item_name,item_type,quantity_used
2026-01-01,LOGAN-001,Cherry Syrup,Syrups,15
2026-01-01,LOGAN-001,Vanilla Syrup,Syrups,12
2026-01-01,LOGAN-001,Cola Base,Sodas,25
2026-01-02,LOGAN-001,Cherry Syrup,Syrups,18
2026-01-02,LOGAN-001,Vanilla Syrup,Syrups,14
2026-01-02,LOGAN-001,Cola Base,Sodas,28
```

---

### Success Criteria

✅ Logistics managers can upload CSV files
✅ CSV data parsed and stored correctly
✅ AI generates accurate usage forecasts
✅ Patterns (weekly, trends) identified
✅ Restock recommendations provided
✅ Optimal restock dates calculated
✅ Model accuracy reported (R² score)
✅ All tests pass with >80% coverage

---

## Task 3.4: Delivery Routing & Scheduling

**Priority**: SHOULD HAVE (S)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1 + Frontend Developer 2

### Requirements
Optimize delivery routes when fulfilling multiple supply requests. Support inter-region deliveries (within 1000 miles). Provide route visualization for logistics managers.

---

*(Implementation details would continue here with:)*
- Route optimization algorithm (nearest-neighbor TSP approximation)
- Multi-stop delivery scheduling
- Distance calculations between hubs and stores
- Inter-region delivery approval workflow
- Route visualization on web dashboard
- Integration with mapping APIs (optional)

---

## Phase 3 Documentation Deliverables

- [x] `docs/SUPPLY_SYSTEM.md` - Supply request workflow
- [x] `docs/CSV_FORMAT.md` - CSV upload specifications and templates
- [x] `docs/AI_FORECASTING.md` - AI forecasting methodology
- [ ] `docs/DELIVERY_ROUTING.md` - Route optimization algorithm
- [ ] Update `docs/API.md` with Phase 3 endpoints
- [ ] Update `CLAUDE.md` with supply system details

---

## Phase 3 Success Criteria

✅ Store managers can submit supply requests
✅ Supply hubs track separate inventory
✅ Logistics managers can approve/deny requests
✅ CSV upload parses usage data correctly
✅ AI generates accurate usage forecasts
✅ Patterns and trends identified
✅ Restock recommendations provided
✅ Delivery routing optimized (nearest-neighbor)
✅ Inter-region deliveries supported (<1000 miles)
✅ Hub-and-spoke P2P communication works
✅ Mobile interface intuitive for managers
✅ Web dashboard functional for logistics managers
✅ All tests pass with >80% coverage
✅ Documentation complete and accurate

---

## Next Phase Preview

**Phase 4: Machine Maintenance Tracking**
- Machine model (one per store with serial number)
- Machine status tracking (7 statuses)
- Maintenance log model
- Repair schedule CSV upload
- Route optimization for repair staff
- Machine status update APIs
- Repair history tracking

**Dependencies for Phase 4**:
- ✅ Role system (Phase 2)
- ✅ Multi-store data model (Phase 1)
- ✅ CSV upload infrastructure (Phase 3)

---

**Phase 3 Complete!** 🎉

Continue to `PLAN_PHASE_4_MAINTENANCE.md` for the next phase.
