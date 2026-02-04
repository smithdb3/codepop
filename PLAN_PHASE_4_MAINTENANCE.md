# Phase 4: Machine Maintenance Tracking (Weeks 10-11)

**Project**: CodePop P2P Distributed System
**Phase Duration**: 2 weeks
**Team Size**: 5 developers
**Dependencies**: Phase 0 (P2P Infrastructure), Phase 1 (Multi-Store), Phase 2 (Roles), Phase 3 (CSV Upload)

---

## Phase Overview

Implement comprehensive machine maintenance tracking for soda-making robots. Each store has exactly one robot with a unique serial number. Repair staff can upload schedules via CSV, track machine status through 7 different states, optimize repair routes using TSP algorithms, and maintain complete maintenance logs.

### Goals
- ✅ Create Machine model (one per store)
- ✅ Track 7 machine status states
- ✅ Implement maintenance log system
- ✅ Build CSV upload for repair schedules
- ✅ Implement route optimization (nearest-neighbor TSP)
- ✅ Create machine status update APIs
- ✅ Build repair history tracking
- ✅ Create mobile screens for repair staff
- ✅ Integrate with repair dashboard from Phase 2

### Machine Status States

```
1. normal          - Operating normally
2. warning         - Non-critical issue, needs attention soon
3. error           - Critical issue, requires repair within a week
4. out-of-order    - Not operational, immediate attention required
5. repair-start    - Servicing started, machine offline
6. repair-end      - Servicing completed, returning to service
7. schedule-service- Operational but needs scheduled maintenance within one month
```

### Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│            Repair Staff Dashboard                    │
│  - Machine Status Overview                           │
│  - Repair Schedule Management                        │
│  - Route Optimization Engine                         │
│  - Maintenance Log Access                            │
└──────────┬──────────────┬──────────────┬───────────┘
           │              │              │
    P2P Communication     │              │
           │              │              │
  ┌────────▼────┐  ┌─────▼─────┐  ┌────▼──────┐
  │ Store A     │  │ Store B   │  │ Store C   │
  │ Machine:    │  │ Machine:  │  │ Machine:  │
  │ SR-A-001    │  │ SR-B-001  │  │ SR-C-001  │
  │ Status: OK  │  │ Status:   │  │ Status:   │
  │             │  │ WARNING   │  │ ERROR     │
  └─────────────┘  └───────────┘  └───────────┘
```

---

## Task 4.1: Machine Model & Status Tracking

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1

### Requirements
Each store has exactly one soda-making robot. The system must track machine serial numbers, operational status, and status history. Status changes trigger notifications to repair staff and store managers.

---

### Test Specifications (Write First!)

Create `backend/tests/test_machine_tracking.py`:

```python
class MachineTrackingTests(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create region and store
        self.region = Region.objects.create(
            region_code='C',
            name='Logan, UT'
        )

        self.hub = SupplyHub.objects.create(
            region=self.region,
            name='Logan UT Supply Hub',
            # ... other fields
        )

        self.store = Store.objects.create(
            store_number='LOGAN-001',
            name='Logan Main Street',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        # Create repair staff user
        self.repair_user = User.objects.create_user(
            username='repair1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.repair_user,
            role_type='REPAIR_STAFF',
            region=self.region
        )

        self.client.force_authenticate(user=self.repair_user)

    def test_store_has_one_machine(self):
        """Test each store has exactly one machine"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot',
            installation_date=timezone.now().date()
        )

        self.assertEqual(Machine.objects.filter(store=self.store).count(), 1)
        self.assertEqual(machine.serial_number, 'SR-LOGAN-001')

    def test_machine_defaults_to_normal_status(self):
        """Test new machine defaults to normal status"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        self.assertEqual(machine.status, 'normal')
        self.assertTrue(machine.is_operational())

    def test_machine_status_update_creates_log(self):
        """Test status changes create maintenance log entries"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        # Update status
        machine.update_status('warning', self.repair_user, 'Strange noise detected')

        # Check log created
        logs = MaintenanceLog.objects.filter(machine=machine)
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().status, 'warning')
        self.assertEqual(logs.first().notes, 'Strange noise detected')

    def test_repair_staff_can_update_machine_status(self):
        """Test repair staff can update machine status"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        response = self.client.patch(
            f'/backend/machines/{machine.machine_id}/status/',
            {
                'status': 'repair-start',
                'notes': 'Starting compressor repair'
            }
        )

        self.assertEqual(response.status_code, 200)
        machine.refresh_from_db()
        self.assertEqual(machine.status, 'repair-start')

    def test_non_operational_statuses(self):
        """Test is_operational() correctly identifies non-operational states"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot',
            status='normal'
        )

        self.assertTrue(machine.is_operational())

        machine.status = 'out-of-order'
        machine.save()
        self.assertFalse(machine.is_operational())

        machine.status = 'repair-start'
        machine.save()
        self.assertFalse(machine.is_operational())

    def test_repair_staff_sees_only_region_machines(self):
        """Test repair staff only sees machines in their region"""
        # Create machine in Region C
        machine_c = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        # Create machine in Region D
        region_d = Region.objects.create(region_code='D', name='Dallas, TX')
        hub_d = SupplyHub.objects.create(region=region_d, name='Dallas Hub')
        store_d = Store.objects.create(
            store_number='DALLAS-001',
            name='Dallas Store',
            region=region_d,
            supply_hub=hub_d,
            # ... other fields
        )
        machine_d = Machine.objects.create(
            store=store_d,
            serial_number='SR-DALLAS-001',
            machine_type='Soda Robot'
        )

        response = self.client.get('/backend/repair/regions/C/machines/')

        self.assertEqual(response.status_code, 200)
        machine_ids = [m['machine_id'] for m in response.data]
        self.assertIn(str(machine_c.machine_id), machine_ids)
        self.assertNotIn(str(machine_d.machine_id), machine_ids)

    def test_status_change_notifies_store_manager(self):
        """Test status changes send notifications via P2P"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        with patch('backend.tasks.send_event_to_peers.delay') as mock_send:
            response = self.client.patch(
                f'/backend/machines/{machine.machine_id}/status/',
                {
                    'status': 'error',
                    'notes': 'Compressor failure detected'
                }
            )

            mock_send.assert_called_once()
            call_args = mock_send.call_args[1]
            self.assertEqual(call_args['event_type'], 'MACHINE_STATUS_CHANGED')

    def test_critical_status_flags_for_urgent_repair(self):
        """Test critical statuses (error, out-of-order) are flagged"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot'
        )

        machine.status = 'error'
        machine.save()
        self.assertTrue(machine.needs_urgent_repair())

        machine.status = 'out-of-order'
        machine.save()
        self.assertTrue(machine.needs_urgent_repair())

        machine.status = 'warning'
        machine.save()
        self.assertFalse(machine.needs_urgent_repair())

    def test_machine_uptime_calculation(self):
        """Test machine uptime statistics"""
        machine = Machine.objects.create(
            store=self.store,
            serial_number='SR-LOGAN-001',
            machine_type='Soda Robot',
            installation_date=timezone.now().date() - timedelta(days=30)
        )

        # Create maintenance logs for downtime
        MaintenanceLog.objects.create(
            machine=machine,
            status='repair-start',
            performed_by=self.repair_user,
            timestamp=timezone.now() - timedelta(days=2)
        )
        MaintenanceLog.objects.create(
            machine=machine,
            status='repair-end',
            performed_by=self.repair_user,
            timestamp=timezone.now() - timedelta(days=1)
        )

        # Calculate uptime
        uptime_percentage = machine.calculate_uptime_percentage(days=30)
        self.assertGreater(uptime_percentage, 95)  # Should be ~96.7%
```

---

### Backend Implementation

**1. Create Machine Model** (`backend/models.py`):

```python
class Machine(models.Model):
    """Soda-making robot at each store (one per store)"""
    machine_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Store relationship (one-to-one)
    store = models.OneToOneField(
        Store,
        on_delete=models.PROTECT,
        related_name='machine'
    )

    # Machine identification
    serial_number = models.CharField(max_length=100, unique=True)
    machine_type = models.CharField(max_length=100, default='Soda Robot')
    model_number = models.CharField(max_length=50, blank=True)
    manufacturer = models.CharField(max_length=100, default='CodePop Industries')

    # Operational status
    STATUS_CHOICES = [
        ('normal', 'Operating Normally'),
        ('warning', 'Warning - Needs Attention Soon'),
        ('error', 'Error - Critical Issue'),
        ('out-of-order', 'Out of Order'),
        ('repair-start', 'Repair In Progress'),
        ('repair-end', 'Repair Completed'),
        ('schedule-service', 'Scheduled Maintenance Needed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='normal')
    status_updated_at = models.DateTimeField(auto_now=True)

    # Installation and warranty
    installation_date = models.DateField()
    warranty_expiration = models.DateField(null=True, blank=True)

    # Maintenance tracking
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)
    maintenance_interval_days = models.IntegerField(default=90)  # 3 months

    # Performance metrics
    total_drinks_made = models.IntegerField(default=0)
    total_runtime_hours = models.FloatField(default=0.0)
    error_count = models.IntegerField(default=0)

    # Additional metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['store__store_number']
        indexes = [
            models.Index(fields=['status', 'store']),
            models.Index(fields=['serial_number']),
        ]

    def __str__(self):
        return f"{self.serial_number} - {self.store.name} ({self.status})"

    def is_operational(self):
        """Check if machine is currently operational"""
        return self.status not in ['out-of-order', 'repair-start']

    def needs_urgent_repair(self):
        """Check if machine needs urgent repair"""
        return self.status in ['error', 'out-of-order']

    def is_due_for_maintenance(self):
        """Check if machine is due for scheduled maintenance"""
        if not self.last_maintenance_date:
            return True

        days_since_maintenance = (
            timezone.now().date() - self.last_maintenance_date
        ).days

        return days_since_maintenance >= self.maintenance_interval_days

    def update_status(self, new_status, performed_by, notes=''):
        """
        Update machine status and create maintenance log entry

        Args:
            new_status: New status value
            performed_by: User making the change
            notes: Notes about the status change
        """
        old_status = self.status
        self.status = new_status
        self.status_updated_at = timezone.now()

        # Update maintenance dates for repair completion
        if new_status == 'repair-end':
            self.last_maintenance_date = timezone.now().date()
            self.next_maintenance_date = (
                timezone.now().date() + timedelta(days=self.maintenance_interval_days)
            )

        # Increment error count
        if new_status in ['error', 'out-of-order']:
            self.error_count += 1

        self.save()

        # Create maintenance log
        MaintenanceLog.objects.create(
            machine=self,
            status=new_status,
            previous_status=old_status,
            performed_by=performed_by,
            notes=notes
        )

        # Send P2P notification to store
        from backend.tasks import send_event_to_peers
        send_event_to_peers.delay(
            event_type='MACHINE_STATUS_CHANGED',
            payload={
                'machine_id': str(self.machine_id),
                'serial_number': self.serial_number,
                'store_name': self.store.name,
                'old_status': old_status,
                'new_status': new_status,
                'notes': notes,
            },
            target_node_id=self.store.node_id
        )

    def calculate_uptime_percentage(self, days=30):
        """
        Calculate machine uptime percentage over specified period

        Args:
            days: Number of days to analyze

        Returns:
            Uptime percentage (0-100)
        """
        start_date = timezone.now() - timedelta(days=days)

        # Get all repair periods in this timeframe
        repair_logs = MaintenanceLog.objects.filter(
            machine=self,
            timestamp__gte=start_date,
            status__in=['repair-start', 'repair-end']
        ).order_by('timestamp')

        total_downtime_seconds = 0
        repair_start_time = None

        for log in repair_logs:
            if log.status == 'repair-start':
                repair_start_time = log.timestamp
            elif log.status == 'repair-end' and repair_start_time:
                downtime = (log.timestamp - repair_start_time).total_seconds()
                total_downtime_seconds += downtime
                repair_start_time = None

        total_period_seconds = days * 24 * 60 * 60
        uptime_seconds = total_period_seconds - total_downtime_seconds
        uptime_percentage = (uptime_seconds / total_period_seconds) * 100

        return round(uptime_percentage, 2)

    def get_maintenance_history(self, limit=10):
        """Get recent maintenance history"""
        return MaintenanceLog.objects.filter(machine=self).order_by('-timestamp')[:limit]


class MaintenanceLog(models.Model):
    """Log of all maintenance actions and status changes"""
    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Machine reference
    machine = models.ForeignKey(
        Machine,
        on_delete=models.CASCADE,
        related_name='maintenance_logs'
    )

    # Status information
    status = models.CharField(max_length=20)
    previous_status = models.CharField(max_length=20, blank=True)

    # Action details
    ACTION_TYPE_CHOICES = [
        ('STATUS_CHANGE', 'Status Change'),
        ('SCHEDULED_MAINTENANCE', 'Scheduled Maintenance'),
        ('EMERGENCY_REPAIR', 'Emergency Repair'),
        ('INSPECTION', 'Routine Inspection'),
        ('PART_REPLACEMENT', 'Part Replacement'),
        ('CLEANING', 'Cleaning'),
        ('CALIBRATION', 'Calibration'),
    ]
    action_type = models.CharField(
        max_length=30,
        choices=ACTION_TYPE_CHOICES,
        default='STATUS_CHANGE'
    )

    # User who performed action
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='maintenance_actions'
    )

    # Details
    notes = models.TextField(blank=True)
    parts_replaced = models.JSONField(default=list, blank=True)
    # Example: [
    #   {"part_name": "Compressor", "part_number": "CP-1000", "quantity": 1},
    #   {"part_name": "Filter", "part_number": "F-200", "quantity": 2}
    # ]

    # Time tracking
    timestamp = models.DateTimeField(auto_now_add=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    # Cost tracking
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['machine', '-timestamp']),
            models.Index(fields=['status', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.machine.serial_number} - {self.status} on {self.timestamp.date()}"

    def total_cost(self):
        """Calculate total cost of maintenance action"""
        labor = self.labor_cost or 0
        parts = self.parts_cost or 0
        return labor + parts
```

**2. Create Machine Status API** (`backend/views.py`):

```python
class RegionMachinesView(APIView):
    """List all machines in a region (for repair staff)"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def get(self, request, region_code):
        """
        GET /backend/repair/regions/<region_code>/machines/?status=error

        Returns list of machines in region
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get stores in region
        stores = Store.objects.filter(region=region)

        # Get machines for these stores
        machines = Machine.objects.filter(store__in=stores)

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            machines = machines.filter(status=status_filter)

        # Filter by urgent repairs if requested
        if request.query_params.get('urgent') == 'true':
            machines = machines.filter(status__in=['error', 'out-of-order'])

        serializer = MachineSerializer(machines, many=True)
        return Response(serializer.data)


class MachineDetailView(APIView):
    """View and update specific machine"""
    permission_classes = [IsAuthenticated]

    def get(self, request, machine_id):
        """
        GET /backend/machines/<machine_id>/

        Returns machine details with maintenance history
        """
        try:
            machine = Machine.objects.get(machine_id=machine_id)
        except Machine.DoesNotExist:
            return Response(
                {'error': 'Machine not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access (repair staff, store manager, or admin)
        has_access = (
            is_super_admin(request.user) or
            UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=machine.store.region,
                is_active=True
            ).exists() or
            UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=machine.store,
                is_active=True
            ).exists()
        )

        if not has_access:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get maintenance history
        maintenance_logs = machine.get_maintenance_history(limit=20)

        # Calculate uptime
        uptime_30d = machine.calculate_uptime_percentage(days=30)
        uptime_7d = machine.calculate_uptime_percentage(days=7)

        return Response({
            'machine': MachineSerializer(machine).data,
            'maintenance_history': MaintenanceLogSerializer(maintenance_logs, many=True).data,
            'uptime': {
                '7_days': uptime_7d,
                '30_days': uptime_30d,
            },
            'is_due_for_maintenance': machine.is_due_for_maintenance(),
            'needs_urgent_repair': machine.needs_urgent_repair(),
        })


class MachineStatusUpdateView(APIView):
    """Update machine status (repair staff only)"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def patch(self, request, machine_id):
        """
        PATCH /backend/machines/<machine_id>/status/
        {
            "status": "repair-start",
            "notes": "Starting compressor repair",
            "action_type": "EMERGENCY_REPAIR",
            "duration_minutes": 120,
            "parts_replaced": [
                {"part_name": "Compressor", "part_number": "CP-1000", "quantity": 1}
            ],
            "labor_cost": 150.00,
            "parts_cost": 450.00
        }

        Update machine status and log maintenance action
        """
        try:
            machine = Machine.objects.get(machine_id=machine_id)
        except Machine.DoesNotExist:
            return Response(
                {'error': 'Machine not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=machine.store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status
        valid_statuses = [choice[0] for choice in Machine.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        old_status = machine.status
        machine.status = new_status
        machine.status_updated_at = timezone.now()

        # Update maintenance dates for repair completion
        if new_status == 'repair-end':
            machine.last_maintenance_date = timezone.now().date()
            machine.next_maintenance_date = (
                timezone.now().date() + timedelta(days=machine.maintenance_interval_days)
            )

        machine.save()

        # Create detailed maintenance log
        log = MaintenanceLog.objects.create(
            machine=machine,
            status=new_status,
            previous_status=old_status,
            performed_by=request.user,
            notes=request.data.get('notes', ''),
            action_type=request.data.get('action_type', 'STATUS_CHANGE'),
            duration_minutes=request.data.get('duration_minutes'),
            parts_replaced=request.data.get('parts_replaced', []),
            labor_cost=request.data.get('labor_cost'),
            parts_cost=request.data.get('parts_cost'),
        )

        # Send notification to store
        send_event_to_peers.delay(
            event_type='MACHINE_STATUS_CHANGED',
            payload={
                'machine_id': str(machine.machine_id),
                'serial_number': machine.serial_number,
                'store_name': machine.store.name,
                'old_status': old_status,
                'new_status': new_status,
                'notes': log.notes,
                'performed_by': request.user.get_full_name(),
            },
            target_node_id=machine.store.node_id
        )

        return Response({
            'machine': MachineSerializer(machine).data,
            'log': MaintenanceLogSerializer(log).data,
        })


class MachineBulkStatusView(APIView):
    """Bulk update machine statuses (for CSV import)"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def post(self, request):
        """
        POST /backend/machines/bulk-status-update/
        {
            "updates": [
                {"serial_number": "SR-LOGAN-001", "status": "normal", "notes": "Passed inspection"},
                {"serial_number": "SR-LOGAN-002", "status": "warning", "notes": "Minor leak"}
            ]
        }

        Bulk update machine statuses
        """
        updates = request.data.get('updates', [])
        if not updates:
            return Response(
                {'error': 'No updates provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = {
            'successful': [],
            'failed': [],
        }

        for update in updates:
            serial_number = update.get('serial_number')
            new_status = update.get('status')

            try:
                machine = Machine.objects.get(serial_number=serial_number)

                # Verify repair staff has access to this region
                if not is_super_admin(request.user):
                    has_access = UserRole.objects.filter(
                        user=request.user,
                        role_type='REPAIR_STAFF',
                        region=machine.store.region,
                        is_active=True
                    ).exists()

                    if not has_access:
                        results['failed'].append({
                            'serial_number': serial_number,
                            'error': 'Access denied to this region'
                        })
                        continue

                # Update status
                machine.update_status(
                    new_status=new_status,
                    performed_by=request.user,
                    notes=update.get('notes', '')
                )

                results['successful'].append({
                    'serial_number': serial_number,
                    'status': new_status
                })

            except Machine.DoesNotExist:
                results['failed'].append({
                    'serial_number': serial_number,
                    'error': 'Machine not found'
                })
            except Exception as e:
                results['failed'].append({
                    'serial_number': serial_number,
                    'error': str(e)
                })

        return Response(results)
```

**3. Create Serializers** (`backend/serializers.py`):

```python
class MachineSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_number = serializers.CharField(source='store.store_number', read_only=True)
    region_code = serializers.CharField(source='store.region.region_code', read_only=True)
    is_operational = serializers.BooleanField(read_only=True)
    needs_urgent_repair = serializers.BooleanField(read_only=True)
    is_due_for_maintenance = serializers.BooleanField(read_only=True)

    class Meta:
        model = Machine
        fields = '__all__'


class MaintenanceLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    machine_serial = serializers.CharField(source='machine.serial_number', read_only=True)

    class Meta:
        model = MaintenanceLog
        fields = '__all__'
```

**4. Add URL Patterns** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Machine Tracking
    path('repair/regions/<str:region_code>/machines/', RegionMachinesView.as_view()),
    path('machines/<uuid:machine_id>/', MachineDetailView.as_view()),
    path('machines/<uuid:machine_id>/status/', MachineStatusUpdateView.as_view()),
    path('machines/bulk-status-update/', MachineBulkStatusView.as_view()),
]
```

---

### Testing Strategy

**Backend Tests**:
```bash
python manage.py test backend.tests.test_machine_tracking
```

**Manual Testing**:
- [ ] Create machine for each store
- [ ] Update machine status
- [ ] Verify maintenance log created
- [ ] Check P2P notification sent
- [ ] Verify repair staff can only see their region
- [ ] Test uptime calculation
- [ ] Test bulk status update

---

### Success Criteria

✅ Each store has exactly one machine
✅ Machine status tracked through all 7 states
✅ Status changes create maintenance logs
✅ Repair staff can update machine status
✅ Store managers notified of status changes via P2P
✅ Uptime calculations accurate
✅ Permission checks prevent unauthorized access
✅ All tests pass with >80% coverage

---

## Task 4.2: Repair Schedule CSV Upload

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 2

### Requirements
Repair staff upload CSV files containing their repair schedules. The system parses schedules, associates them with machines, and provides schedule management capabilities.

---

### Test Specifications (Write First!)

Create `backend/tests/test_repair_schedule.py`:

```python
class RepairScheduleTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(region=self.region, name='Logan Hub')

        # Create stores and machines
        self.stores = []
        self.machines = []
        for i in range(1, 6):
            store = Store.objects.create(
                store_number=f'LOGAN-00{i}',
                name=f'Logan Store {i}',
                region=self.region,
                supply_hub=self.hub,
                latitude=41.7370 + (i * 0.01),
                longitude=-111.8338 + (i * 0.01),
                # ... other fields
            )
            machine = Machine.objects.create(
                store=store,
                serial_number=f'SR-LOGAN-00{i}',
                machine_type='Soda Robot',
                installation_date=timezone.now().date()
            )
            self.stores.append(store)
            self.machines.append(machine)

        # Create repair staff
        self.repair_user = User.objects.create_user(
            username='repair1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.repair_user,
            role_type='REPAIR_STAFF',
            region=self.region
        )

        self.client.force_authenticate(user=self.repair_user)

    def test_csv_upload_creates_repair_schedule(self):
        """Test CSV upload creates repair schedule entries"""
        csv_content = b"""store_number,serial_number,scheduled_date,scheduled_time,action_type,estimated_duration,notes
LOGAN-001,SR-LOGAN-001,2026-02-10,09:00,SCHEDULED_MAINTENANCE,120,Quarterly maintenance
LOGAN-002,SR-LOGAN-002,2026-02-10,13:00,INSPECTION,60,Routine inspection
LOGAN-003,SR-LOGAN-003,2026-02-11,09:00,PART_REPLACEMENT,180,Replace filter
"""
        csv_file = SimpleUploadedFile(
            "repair_schedule.csv",
            csv_content,
            content_type="text/csv"
        )

        response = self.client.post(
            f'/backend/repair/regions/C/schedule/upload/',
            {'file': csv_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(RepairSchedule.objects.count(), 3)

    def test_invalid_serial_number_rejected(self):
        """Test invalid serial numbers are rejected"""
        csv_content = b"""store_number,serial_number,scheduled_date,scheduled_time,action_type,estimated_duration,notes
LOGAN-001,INVALID-SERIAL,2026-02-10,09:00,INSPECTION,60,Test
"""
        csv_file = SimpleUploadedFile(
            "bad_schedule.csv",
            csv_content,
            content_type="text/csv"
        )

        response = self.client.post(
            f'/backend/repair/regions/C/schedule/upload/',
            {'file': csv_file},
            format='multipart'
        )

        # Should succeed but report failures
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['failed_count'], 1)

    def test_repair_staff_can_view_schedule(self):
        """Test repair staff can view their schedule"""
        # Create schedule entries
        for i, machine in enumerate(self.machines[:3]):
            RepairSchedule.objects.create(
                machine=machine,
                scheduled_by=self.repair_user,
                scheduled_date=timezone.now().date() + timedelta(days=i),
                scheduled_time=time(9, 0),
                action_type='SCHEDULED_MAINTENANCE',
                estimated_duration_minutes=120
            )

        response = self.client.get(
            f'/backend/repair/regions/C/schedule/?start_date=2026-02-01&end_date=2026-02-28'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

    def test_schedule_can_be_cancelled(self):
        """Test repair schedule entries can be cancelled"""
        schedule = RepairSchedule.objects.create(
            machine=self.machines[0],
            scheduled_by=self.repair_user,
            scheduled_date=timezone.now().date() + timedelta(days=1),
            scheduled_time=time(9, 0),
            action_type='INSPECTION',
            status='SCHEDULED'
        )

        response = self.client.patch(
            f'/backend/repair/schedule/{schedule.schedule_id}/',
            {'status': 'CANCELLED', 'cancellation_reason': 'Machine repaired by another technician'}
        )

        self.assertEqual(response.status_code, 200)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'CANCELLED')

    def test_completed_schedule_creates_maintenance_log(self):
        """Test marking schedule as completed creates maintenance log"""
        schedule = RepairSchedule.objects.create(
            machine=self.machines[0],
            scheduled_by=self.repair_user,
            scheduled_date=timezone.now().date(),
            scheduled_time=time(9, 0),
            action_type='SCHEDULED_MAINTENANCE',
            status='IN_PROGRESS'
        )

        response = self.client.patch(
            f'/backend/repair/schedule/{schedule.schedule_id}/complete/',
            {
                'notes': 'Maintenance completed successfully',
                'duration_minutes': 135,
                'parts_replaced': [
                    {'part_name': 'Filter', 'part_number': 'F-200', 'quantity': 2}
                ]
            }
        )

        self.assertEqual(response.status_code, 200)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'COMPLETED')

        # Check maintenance log created
        logs = MaintenanceLog.objects.filter(machine=self.machines[0])
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().action_type, 'SCHEDULED_MAINTENANCE')
```

---

### Backend Implementation

**1. Create RepairSchedule Model** (`backend/models.py`):

```python
class RepairSchedule(models.Model):
    """Scheduled repair and maintenance appointments"""
    schedule_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Machine reference
    machine = models.ForeignKey(
        Machine,
        on_delete=models.CASCADE,
        related_name='repair_schedules'
    )

    # Scheduling information
    scheduled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='scheduled_repairs'
    )
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()

    # Action details
    action_type = models.CharField(
        max_length=30,
        choices=MaintenanceLog.ACTION_TYPE_CHOICES,
        default='SCHEDULED_MAINTENANCE'
    )
    estimated_duration_minutes = models.IntegerField()

    # Status tracking
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('RESCHEDULED', 'Rescheduled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')

    # Details
    notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)

    # Completion tracking
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    actual_duration_minutes = models.IntegerField(null=True, blank=True)

    # Rescheduling
    rescheduled_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rescheduled_to'
    )

    # Route optimization data
    route_order = models.IntegerField(null=True, blank=True)  # Order in optimized route

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_date', 'scheduled_time', 'route_order']
        indexes = [
            models.Index(fields=['machine', 'scheduled_date']),
            models.Index(fields=['scheduled_by', 'status']),
            models.Index(fields=['scheduled_date', 'status']),
        ]

    def __str__(self):
        return f"{self.machine.serial_number} - {self.action_type} on {self.scheduled_date}"

    def is_overdue(self):
        """Check if scheduled appointment is overdue"""
        if self.status != 'SCHEDULED':
            return False

        scheduled_datetime = timezone.make_aware(
            datetime.combine(self.scheduled_date, self.scheduled_time)
        )
        return timezone.now() > scheduled_datetime

    def mark_completed(self, performed_by, notes='', parts_replaced=None, duration_minutes=None):
        """
        Mark schedule as completed and create maintenance log

        Args:
            performed_by: User who completed the repair
            notes: Notes about the work performed
            parts_replaced: List of parts replaced
            duration_minutes: Actual duration
        """
        self.status = 'COMPLETED'
        self.actual_end_time = timezone.now()

        if self.actual_start_time:
            self.actual_duration_minutes = int(
                (self.actual_end_time - self.actual_start_time).total_seconds() / 60
            )
        elif duration_minutes:
            self.actual_duration_minutes = duration_minutes

        self.save()

        # Create maintenance log
        MaintenanceLog.objects.create(
            machine=self.machine,
            status='repair-end',
            previous_status=self.machine.status,
            action_type=self.action_type,
            performed_by=performed_by,
            notes=notes,
            parts_replaced=parts_replaced or [],
            duration_minutes=self.actual_duration_minutes,
        )

        # Update machine status to normal if it was in repair
        if self.machine.status == 'repair-start':
            self.machine.status = 'normal'
            self.machine.last_maintenance_date = timezone.now().date()
            self.machine.save()
```

**2. Create Schedule Upload API** (`backend/views.py`):

```python
class RepairScheduleUploadView(APIView):
    """Upload repair schedule via CSV"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, region_code):
        """
        POST /backend/repair/regions/<region_code>/schedule/upload/

        Upload CSV with columns:
        - store_number
        - serial_number
        - scheduled_date (YYYY-MM-DD)
        - scheduled_time (HH:MM)
        - action_type
        - estimated_duration (minutes)
        - notes (optional)
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
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

        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be CSV format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse CSV
            df = pd.read_csv(csv_file)

            # Validate columns
            required_columns = [
                'store_number', 'serial_number', 'scheduled_date',
                'scheduled_time', 'action_type', 'estimated_duration'
            ]
            if not all(col in df.columns for col in required_columns):
                return Response(
                    {
                        'error': 'Invalid CSV format',
                        'required_columns': required_columns,
                        'provided_columns': list(df.columns)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse dates and times
            df['scheduled_date'] = pd.to_datetime(df['scheduled_date']).dt.date
            df['scheduled_time'] = pd.to_datetime(df['scheduled_time'], format='%H:%M').dt.time

            # Create schedule entries
            results = {
                'successful': [],
                'failed': [],
            }

            for _, row in df.iterrows():
                try:
                    # Find machine
                    machine = Machine.objects.get(
                        serial_number=row['serial_number'],
                        store__region=region
                    )

                    # Create schedule entry
                    schedule = RepairSchedule.objects.create(
                        machine=machine,
                        scheduled_by=request.user,
                        scheduled_date=row['scheduled_date'],
                        scheduled_time=row['scheduled_time'],
                        action_type=row['action_type'],
                        estimated_duration_minutes=int(row['estimated_duration']),
                        notes=row.get('notes', '')
                    )

                    results['successful'].append({
                        'serial_number': row['serial_number'],
                        'scheduled_date': str(row['scheduled_date']),
                        'schedule_id': str(schedule.schedule_id)
                    })

                except Machine.DoesNotExist:
                    results['failed'].append({
                        'serial_number': row['serial_number'],
                        'error': 'Machine not found or not in this region'
                    })
                except Exception as e:
                    results['failed'].append({
                        'serial_number': row['serial_number'],
                        'error': str(e)
                    })

            return Response({
                'message': 'Schedule upload processed',
                'successful_count': len(results['successful']),
                'failed_count': len(results['failed']),
                'results': results
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to parse CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RepairScheduleView(APIView):
    """View and manage repair schedules"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def get(self, request, region_code):
        """
        GET /backend/repair/regions/<region_code>/schedule/?start_date=2026-02-01&end_date=2026-02-28&status=SCHEDULED

        Returns repair schedule for region
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get machines in region
        stores = Store.objects.filter(region=region)
        machines = Machine.objects.filter(store__in=stores)

        # Get schedules for these machines
        schedules = RepairSchedule.objects.filter(machine__in=machines)

        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            schedules = schedules.filter(scheduled_date__gte=start_date)
        if end_date:
            schedules = schedules.filter(scheduled_date__lte=end_date)

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            schedules = schedules.filter(status=status_filter)

        serializer = RepairScheduleSerializer(schedules, many=True)
        return Response(serializer.data)


class RepairScheduleDetailView(APIView):
    """Manage individual schedule entry"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def get(self, request, schedule_id):
        """Get schedule details"""
        try:
            schedule = RepairSchedule.objects.get(schedule_id=schedule_id)
        except RepairSchedule.DoesNotExist:
            return Response(
                {'error': 'Schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=schedule.machine.store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = RepairScheduleSerializer(schedule)
        return Response(serializer.data)

    def patch(self, request, schedule_id):
        """
        PATCH /backend/repair/schedule/<schedule_id>/
        {
            "status": "CANCELLED",
            "cancellation_reason": "Machine already repaired"
        }

        Update schedule status
        """
        try:
            schedule = RepairSchedule.objects.get(schedule_id=schedule_id)
        except RepairSchedule.DoesNotExist:
            return Response(
                {'error': 'Schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=schedule.machine.store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Update fields
        if 'status' in request.data:
            schedule.status = request.data['status']
        if 'cancellation_reason' in request.data:
            schedule.cancellation_reason = request.data['cancellation_reason']
        if 'notes' in request.data:
            schedule.notes = request.data['notes']

        schedule.save()

        serializer = RepairScheduleSerializer(schedule)
        return Response(serializer.data)

    def delete(self, request, schedule_id):
        """Delete schedule entry"""
        try:
            schedule = RepairSchedule.objects.get(schedule_id=schedule_id)
        except RepairSchedule.DoesNotExist:
            return Response(
                {'error': 'Schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=schedule.machine.store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        schedule.delete()
        return Response({'message': 'Schedule deleted'}, status=status.HTTP_204_NO_CONTENT)


class RepairScheduleCompleteView(APIView):
    """Mark schedule as completed"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def post(self, request, schedule_id):
        """
        POST /backend/repair/schedule/<schedule_id>/complete/
        {
            "notes": "Maintenance completed successfully",
            "duration_minutes": 135,
            "parts_replaced": [
                {"part_name": "Filter", "part_number": "F-200", "quantity": 2}
            ],
            "labor_cost": 100.00,
            "parts_cost": 50.00
        }

        Mark schedule as completed and create maintenance log
        """
        try:
            schedule = RepairSchedule.objects.get(schedule_id=schedule_id)
        except RepairSchedule.DoesNotExist:
            return Response(
                {'error': 'Schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=schedule.machine.store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Mark as completed
        schedule.status = 'COMPLETED'
        schedule.actual_end_time = timezone.now()

        if not schedule.actual_start_time:
            schedule.actual_start_time = timezone.now() - timedelta(
                minutes=request.data.get('duration_minutes', schedule.estimated_duration_minutes)
            )

        schedule.actual_duration_minutes = request.data.get('duration_minutes')
        schedule.save()

        # Create maintenance log
        log = MaintenanceLog.objects.create(
            machine=schedule.machine,
            status='repair-end',
            previous_status=schedule.machine.status,
            action_type=schedule.action_type,
            performed_by=request.user,
            notes=request.data.get('notes', ''),
            parts_replaced=request.data.get('parts_replaced', []),
            duration_minutes=schedule.actual_duration_minutes,
            labor_cost=request.data.get('labor_cost'),
            parts_cost=request.data.get('parts_cost'),
        )

        # Update machine status if needed
        if schedule.machine.status in ['repair-start', 'out-of-order']:
            schedule.machine.status = 'normal'
            schedule.machine.last_maintenance_date = timezone.now().date()
            schedule.machine.save()

        return Response({
            'schedule': RepairScheduleSerializer(schedule).data,
            'log': MaintenanceLogSerializer(log).data,
        })
```

**3. Create Serializer** (`backend/serializers.py`):

```python
class RepairScheduleSerializer(serializers.ModelSerializer):
    machine_serial = serializers.CharField(source='machine.serial_number', read_only=True)
    store_name = serializers.CharField(source='machine.store.name', read_only=True)
    store_number = serializers.CharField(source='machine.store.store_number', read_only=True)
    scheduled_by_name = serializers.CharField(source='scheduled_by.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = RepairSchedule
        fields = '__all__'
```

**4. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Repair Schedule
    path('repair/regions/<str:region_code>/schedule/upload/', RepairScheduleUploadView.as_view()),
    path('repair/regions/<str:region_code>/schedule/', RepairScheduleView.as_view()),
    path('repair/schedule/<uuid:schedule_id>/', RepairScheduleDetailView.as_view()),
    path('repair/schedule/<uuid:schedule_id>/complete/', RepairScheduleCompleteView.as_view()),
]
```

**5. Create CSV Template** (`docs/repair_schedule_template.csv`):

```csv
store_number,serial_number,scheduled_date,scheduled_time,action_type,estimated_duration,notes
LOGAN-001,SR-LOGAN-001,2026-02-10,09:00,SCHEDULED_MAINTENANCE,120,Quarterly maintenance check
LOGAN-002,SR-LOGAN-002,2026-02-10,13:00,INSPECTION,60,Routine inspection
LOGAN-003,SR-LOGAN-003,2026-02-11,09:00,PART_REPLACEMENT,180,Replace filter assembly
LOGAN-004,SR-LOGAN-004,2026-02-11,14:00,CLEANING,90,Deep cleaning and sanitization
LOGAN-005,SR-LOGAN-005,2026-02-12,09:00,CALIBRATION,60,Calibrate dispensing system
```

---

### Success Criteria

✅ Repair staff can upload CSV schedules
✅ Schedule entries created correctly
✅ Invalid serial numbers handled gracefully
✅ Schedules can be viewed and filtered
✅ Schedules can be cancelled or rescheduled
✅ Completing schedule creates maintenance log
✅ Machine status updated on completion
✅ All tests pass with >80% coverage

---

## Task 4.3: Route Optimization for Repair Staff

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 3

### Requirements
Optimize repair routes using nearest-neighbor approximation of Traveling Salesman Problem (TSP). Given a list of scheduled repairs for a day, calculate the most efficient route to minimize travel time.

---

### Test Specifications (Write First!)

Create `backend/tests/test_route_optimization.py`:

```python
class RouteOptimizationTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(region=self.region, name='Logan Hub')

        # Create stores at different locations
        self.stores = []
        coordinates = [
            (41.7370, -111.8338),  # Store 1 - Center
            (41.7400, -111.8300),  # Store 2 - NE
            (41.7340, -111.8380),  # Store 3 - SW
            (41.7420, -111.8350),  # Store 4 - N
            (41.7360, -111.8310),  # Store 5 - SE
        ]

        for i, (lat, lon) in enumerate(coordinates, 1):
            store = Store.objects.create(
                store_number=f'LOGAN-00{i}',
                name=f'Logan Store {i}',
                region=self.region,
                supply_hub=self.hub,
                latitude=lat,
                longitude=lon,
                # ... other fields
            )
            machine = Machine.objects.create(
                store=store,
                serial_number=f'SR-LOGAN-00{i}',
                machine_type='Soda Robot',
                installation_date=timezone.now().date()
            )
            self.stores.append(store)

        # Create repair staff
        self.repair_user = User.objects.create_user(
            username='repair1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.repair_user,
            role_type='REPAIR_STAFF',
            region=self.region
        )

        self.client.force_authenticate(user=self.repair_user)

    def test_optimize_route_calculates_distances(self):
        """Test route optimization calculates distances between stores"""
        # Create schedules for all stores on same day
        schedules = []
        for store in self.stores:
            schedule = RepairSchedule.objects.create(
                machine=store.machine,
                scheduled_by=self.repair_user,
                scheduled_date=timezone.now().date(),
                scheduled_time=time(9, 0),
                action_type='INSPECTION',
                estimated_duration_minutes=60
            )
            schedules.append(schedule)

        response = self.client.post(
            f'/backend/repair/regions/C/optimize-route/',
            {
                'date': str(timezone.now().date()),
                'start_location': {
                    'latitude': 41.7370,
                    'longitude': -111.8338
                }
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('optimized_route', response.data)
        self.assertEqual(len(response.data['optimized_route']), 5)

    def test_optimized_route_shorter_than_original(self):
        """Test optimized route is shorter than unoptimized"""
        # Create schedules
        schedules = []
        for store in self.stores:
            schedule = RepairSchedule.objects.create(
                machine=store.machine,
                scheduled_by=self.repair_user,
                scheduled_date=timezone.now().date(),
                scheduled_time=time(9, 0),
                action_type='INSPECTION',
                estimated_duration_minutes=60
            )
            schedules.append(schedule)

        response = self.client.post(
            f'/backend/repair/regions/C/optimize-route/',
            {
                'date': str(timezone.now().date()),
                'start_location': {
                    'latitude': 41.7370,
                    'longitude': -111.8338
                }
            }
        )

        original_distance = response.data['comparison']['original_distance_miles']
        optimized_distance = response.data['comparison']['optimized_distance_miles']

        # Optimized should be <= original
        self.assertLessEqual(optimized_distance, original_distance)

    def test_route_optimization_updates_schedule_order(self):
        """Test route optimization updates route_order field"""
        # Create schedules
        for store in self.stores:
            RepairSchedule.objects.create(
                machine=store.machine,
                scheduled_by=self.repair_user,
                scheduled_date=timezone.now().date(),
                scheduled_time=time(9, 0),
                action_type='INSPECTION',
                estimated_duration_minutes=60
            )

        response = self.client.post(
            f'/backend/repair/regions/C/optimize-route/',
            {
                'date': str(timezone.now().date()),
                'start_location': {
                    'latitude': 41.7370,
                    'longitude': -111.8338
                },
                'save_order': True
            }
        )

        # Check schedules have route_order set
        schedules = RepairSchedule.objects.filter(
            scheduled_date=timezone.now().date()
        ).exclude(route_order__isnull=True)

        self.assertEqual(schedules.count(), 5)

    def test_route_includes_time_estimates(self):
        """Test route includes arrival time estimates"""
        for store in self.stores:
            RepairSchedule.objects.create(
                machine=store.machine,
                scheduled_by=self.repair_user,
                scheduled_date=timezone.now().date(),
                scheduled_time=time(9, 0),
                action_type='INSPECTION',
                estimated_duration_minutes=60
            )

        response = self.client.post(
            f'/backend/repair/regions/C/optimize-route/',
            {
                'date': str(timezone.now().date()),
                'start_location': {
                    'latitude': 41.7370,
                    'longitude': -111.8338
                },
                'start_time': '09:00'
            }
        )

        # Each stop should have estimated arrival time
        for stop in response.data['optimized_route']:
            self.assertIn('estimated_arrival_time', stop)
            self.assertIn('estimated_departure_time', stop)
```

---

### Backend Implementation

**1. Create Route Optimization Service** (`backend/services/route_optimizer.py`):

```python
import math
from typing import List, Tuple, Dict
from backend.models import RepairSchedule, Store
from backend.utils import calculate_distance


class RouteOptimizer:
    """
    Route optimization using nearest-neighbor approximation of TSP

    This is a greedy algorithm that:
    1. Starts at a given location
    2. Always visits the nearest unvisited location next
    3. Returns to start (optional)

    Time complexity: O(n²) where n is number of stops
    Not guaranteed optimal, but provides good approximation quickly
    """

    def __init__(self, schedules: List[RepairSchedule], start_lat: float, start_lon: float):
        """
        Initialize route optimizer

        Args:
            schedules: List of repair schedules to optimize
            start_lat: Starting latitude
            start_lon: Starting longitude
        """
        self.schedules = schedules
        self.start_location = (start_lat, start_lon)

        # Extract store locations
        self.locations = []
        for schedule in schedules:
            self.locations.append({
                'schedule_id': schedule.schedule_id,
                'store_name': schedule.machine.store.name,
                'latitude': schedule.machine.store.latitude,
                'longitude': schedule.machine.store.longitude,
                'estimated_duration': schedule.estimated_duration_minutes,
            })

    def optimize(self) -> Dict:
        """
        Optimize route using nearest-neighbor algorithm

        Returns:
            Dictionary with optimized route and metrics
        """
        if not self.locations:
            return {
                'optimized_route': [],
                'total_distance_miles': 0,
                'estimated_travel_time_minutes': 0,
            }

        # Nearest-neighbor algorithm
        unvisited = self.locations.copy()
        current_location = self.start_location
        route = []
        total_distance = 0

        while unvisited:
            # Find nearest unvisited location
            nearest = min(
                unvisited,
                key=lambda loc: calculate_distance(
                    current_location[0], current_location[1],
                    loc['latitude'], loc['longitude']
                )
            )

            # Calculate distance to nearest
            distance = calculate_distance(
                current_location[0], current_location[1],
                nearest['latitude'], nearest['longitude']
            )

            # Add to route
            route.append({
                **nearest,
                'distance_from_previous': round(distance, 2),
                'route_order': len(route) + 1,
            })

            # Update current location and remove from unvisited
            current_location = (nearest['latitude'], nearest['longitude'])
            total_distance += distance
            unvisited.remove(nearest)

        # Calculate travel time (assuming 30 mph average in city)
        avg_speed_mph = 30
        travel_time_minutes = (total_distance / avg_speed_mph) * 60

        # Calculate total time including work duration
        total_work_minutes = sum(loc['estimated_duration'] for loc in self.locations)
        total_time_minutes = travel_time_minutes + total_work_minutes

        return {
            'optimized_route': route,
            'total_distance_miles': round(total_distance, 2),
            'estimated_travel_time_minutes': round(travel_time_minutes, 0),
            'estimated_work_time_minutes': total_work_minutes,
            'estimated_total_time_minutes': round(total_time_minutes, 0),
        }

    def calculate_original_order_distance(self) -> float:
        """Calculate total distance for original schedule order"""
        if not self.locations:
            return 0

        current_location = self.start_location
        total_distance = 0

        for location in self.locations:
            distance = calculate_distance(
                current_location[0], current_location[1],
                location['latitude'], location['longitude']
            )
            total_distance += distance
            current_location = (location['latitude'], location['longitude'])

        return round(total_distance, 2)

    def add_time_estimates(self, route: List[Dict], start_time_str: str = '09:00') -> List[Dict]:
        """
        Add arrival and departure time estimates to route

        Args:
            route: Optimized route from optimize()
            start_time_str: Start time in HH:MM format

        Returns:
            Route with time estimates added
        """
        from datetime import datetime, timedelta

        # Parse start time
        start_hour, start_minute = map(int, start_time_str.split(':'))
        current_time = datetime.now().replace(
            hour=start_hour,
            minute=start_minute,
            second=0,
            microsecond=0
        )

        enriched_route = []

        for stop in route:
            # Add travel time to get arrival time
            travel_minutes = (stop['distance_from_previous'] / 30) * 60  # 30 mph average
            current_time += timedelta(minutes=travel_minutes)
            arrival_time = current_time

            # Add work duration to get departure time
            current_time += timedelta(minutes=stop['estimated_duration'])
            departure_time = current_time

            enriched_route.append({
                **stop,
                'estimated_arrival_time': arrival_time.strftime('%H:%M'),
                'estimated_departure_time': departure_time.strftime('%H:%M'),
            })

        return enriched_route
```

**2. Create Route Optimization API** (`backend/views.py`):

```python
from backend.services.route_optimizer import RouteOptimizer


class RouteOptimizationView(APIView):
    """Optimize repair route for a given day"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def post(self, request, region_code):
        """
        POST /backend/repair/regions/<region_code>/optimize-route/
        {
            "date": "2026-02-10",
            "start_location": {
                "latitude": 41.7370,
                "longitude": -111.8338
            },
            "start_time": "09:00",
            "save_order": true
        }

        Optimize repair route using nearest-neighbor TSP approximation
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get schedules for specified date
        target_date = request.data.get('date')
        if not target_date:
            return Response(
                {'error': 'Date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get start location
        start_location = request.data.get('start_location')
        if not start_location or 'latitude' not in start_location or 'longitude' not in start_location:
            return Response(
                {'error': 'start_location with latitude and longitude is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_lat = float(start_location['latitude'])
        start_lon = float(start_location['longitude'])

        # Get schedules for this date
        stores = Store.objects.filter(region=region)
        machines = Machine.objects.filter(store__in=stores)
        schedules = RepairSchedule.objects.filter(
            machine__in=machines,
            scheduled_date=target_date,
            status='SCHEDULED'
        )

        if not schedules.exists():
            return Response(
                {'error': 'No scheduled repairs found for this date'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Optimize route
        optimizer = RouteOptimizer(list(schedules), start_lat, start_lon)
        original_distance = optimizer.calculate_original_order_distance()
        result = optimizer.optimize()

        # Add time estimates
        start_time = request.data.get('start_time', '09:00')
        result['optimized_route'] = optimizer.add_time_estimates(
            result['optimized_route'],
            start_time
        )

        # Save route order if requested
        if request.data.get('save_order', False):
            for stop in result['optimized_route']:
                schedule = RepairSchedule.objects.get(schedule_id=stop['schedule_id'])
                schedule.route_order = stop['route_order']
                schedule.save()

        # Add comparison metrics
        result['comparison'] = {
            'original_distance_miles': original_distance,
            'optimized_distance_miles': result['total_distance_miles'],
            'distance_saved_miles': round(original_distance - result['total_distance_miles'], 2),
            'percent_improvement': round(
                ((original_distance - result['total_distance_miles']) / original_distance) * 100, 1
            ) if original_distance > 0 else 0
        }

        return Response(result)


class RouteVisualizationView(APIView):
    """Get route data for visualization on map"""
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def get(self, request, region_code):
        """
        GET /backend/repair/regions/<region_code>/route-map/?date=2026-02-10

        Returns route data formatted for map visualization
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get date
        target_date = request.query_params.get('date')
        if not target_date:
            target_date = timezone.now().date()

        # Get schedules
        stores = Store.objects.filter(region=region)
        machines = Machine.objects.filter(store__in=stores)
        schedules = RepairSchedule.objects.filter(
            machine__in=machines,
            scheduled_date=target_date,
            status='SCHEDULED'
        ).order_by('route_order', 'scheduled_time')

        # Format for map
        markers = []
        for schedule in schedules:
            markers.append({
                'latitude': schedule.machine.store.latitude,
                'longitude': schedule.machine.store.longitude,
                'title': schedule.machine.store.name,
                'description': f"{schedule.action_type} - {schedule.estimated_duration_minutes} min",
                'order': schedule.route_order or 0,
                'schedule_id': str(schedule.schedule_id),
            })

        # Create path (lines between points)
        path = [
            {
                'latitude': marker['latitude'],
                'longitude': marker['longitude']
            }
            for marker in sorted(markers, key=lambda x: x['order'])
        ]

        return Response({
            'markers': markers,
            'path': path,
            'center': {
                'latitude': region.center_latitude,
                'longitude': region.center_longitude
            }
        })
```

**3. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Route Optimization
    path('repair/regions/<str:region_code>/optimize-route/', RouteOptimizationView.as_view()),
    path('repair/regions/<str:region_code>/route-map/', RouteVisualizationView.as_view()),
]
```

---

### Success Criteria

✅ Route optimization uses nearest-neighbor TSP algorithm
✅ Optimized routes shorter than unoptimized
✅ Time estimates calculated accurately
✅ Route order can be saved to schedules
✅ Comparison metrics show improvement percentage
✅ Map visualization data provided
✅ All tests pass with >80% coverage

---

## Task 4.4: Mobile Interface for Repair Staff

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Frontend Developer 1

### Requirements
Create mobile screens for repair staff to view machines, update status, manage schedules, and optimize routes. Integrate with Phase 2 repair dashboard.

---

### Frontend Implementation

**1. Update Repair Dashboard with Machine List** (`codepop/src/pages/RepairDashboard.js`):

Update the existing RepairDashboard component from Phase 2 to show real machine data:

```javascript
// Update the dashboard data loading
const loadDashboard = async (regionCode) => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('userToken');

    const response = await fetch(
      `${BASE_URL}/backend/repair/regions/${regionCode}/dashboard/`,
      {
        headers: {
          'Authorization': `Token ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setDashboardData(data);

      // Also load machines for region
      const machinesResponse = await fetch(
        `${BASE_URL}/backend/repair/regions/${regionCode}/machines/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (machinesResponse.ok) {
        const machinesData = await machinesResponse.json();
        setDashboardData(prev => ({
          ...prev,
          machines: machinesData
        }));
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
```

**2. Create Machine Detail Screen** (`codepop/src/pages/MachineDetailScreen.js`):

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../ip_address';

export default function MachineDetailScreen({ route, navigation }) {
  const { machineId } = route.params;

  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [uptime, setUptime] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: 'normal',
    notes: '',
    action_type: 'STATUS_CHANGE',
    duration_minutes: '',
    labor_cost: '',
    parts_cost: '',
  });

  useEffect(() => {
    loadMachineData();
  }, []);

  const loadMachineData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/machines/${machineId}/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMachine(data.machine);
        setMaintenanceHistory(data.maintenance_history);
        setUptime(data.uptime);
      }
    } catch (error) {
      console.error('Failed to load machine data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/machines/${machineId}/status/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: statusUpdate.status,
            notes: statusUpdate.notes,
            action_type: statusUpdate.action_type,
            duration_minutes: statusUpdate.duration_minutes ? parseInt(statusUpdate.duration_minutes) : null,
            labor_cost: statusUpdate.labor_cost ? parseFloat(statusUpdate.labor_cost) : null,
            parts_cost: statusUpdate.parts_cost ? parseFloat(statusUpdate.parts_cost) : null,
          }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Machine status updated');
        setShowStatusModal(false);
        loadMachineData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'normal': '#8df1d3',
      'warning': '#FFA686',
      'error': '#D30C7B',
      'out-of-order': '#333',
      'repair-start': '#C6C8EE',
      'repair-end': '#8df1d3',
      'schedule-service': '#FFA686',
    };
    return colors[status] || '#C6C8EE';
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
      {/* Machine Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{machine.store_name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(machine.status) },
            ]}
          >
            <Text style={styles.statusText}>{machine.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Serial Number:</Text>
          <Text style={styles.value}>{machine.serial_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Store Number:</Text>
          <Text style={styles.value}>{machine.store_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Installation Date:</Text>
          <Text style={styles.value}>
            {new Date(machine.installation_date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Total Drinks Made:</Text>
          <Text style={styles.value}>{machine.total_drinks_made.toLocaleString()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Error Count:</Text>
          <Text style={styles.value}>{machine.error_count}</Text>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => setShowStatusModal(true)}
        >
          <Text style={styles.updateButtonText}>Update Status</Text>
        </TouchableOpacity>
      </View>

      {/* Uptime Stats */}
      {uptime && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Uptime Statistics</Text>

          <View style={styles.uptimeGrid}>
            <View style={styles.uptimeCard}>
              <Text style={styles.uptimeValue}>{uptime['7_days']}%</Text>
              <Text style={styles.uptimeLabel}>7 Days</Text>
            </View>
            <View style={styles.uptimeCard}>
              <Text style={styles.uptimeValue}>{uptime['30_days']}%</Text>
              <Text style={styles.uptimeLabel}>30 Days</Text>
            </View>
          </View>
        </View>
      )}

      {/* Maintenance History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Maintenance History</Text>

        {maintenanceHistory.map((log, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyStatus}>{log.status}</Text>
              <Text style={styles.historyDate}>
                {new Date(log.timestamp).toLocaleDateString()}
              </Text>
            </View>
            {log.notes && (
              <Text style={styles.historyNotes}>{log.notes}</Text>
            )}
            {log.performed_by_name && (
              <Text style={styles.historyPerformer}>
                By: {log.performed_by_name}
              </Text>
            )}
            {log.duration_minutes && (
              <Text style={styles.historyDuration}>
                Duration: {log.duration_minutes} minutes
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Machine Status</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status Selector */}
            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusButtons}>
              {['normal', 'warning', 'error', 'out-of-order', 'repair-start', 'repair-end', 'schedule-service'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    statusUpdate.status === status && styles.statusButtonActive,
                    { borderColor: getStatusColor(status) }
                  ]}
                  onPress={() => setStatusUpdate({ ...statusUpdate, status })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      statusUpdate.status === status && styles.statusButtonTextActive,
                    ]}
                  >
                    {status.replace('-', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Type */}
            <Text style={styles.modalLabel}>Action Type</Text>
            <View style={styles.actionButtons}>
              {['STATUS_CHANGE', 'SCHEDULED_MAINTENANCE', 'EMERGENCY_REPAIR', 'INSPECTION', 'PART_REPLACEMENT'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.actionButton,
                    statusUpdate.action_type === type && styles.actionButtonActive,
                  ]}
                  onPress={() => setStatusUpdate({ ...statusUpdate, action_type: type })}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      statusUpdate.action_type === type && styles.actionButtonTextActive,
                    ]}
                  >
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              value={statusUpdate.notes}
              onChangeText={(text) => setStatusUpdate({ ...statusUpdate, notes: text })}
              placeholder="Describe the work performed or issue identified..."
            />

            {/* Duration */}
            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={statusUpdate.duration_minutes}
              onChangeText={(text) => setStatusUpdate({ ...statusUpdate, duration_minutes: text })}
              placeholder="120"
            />

            {/* Costs */}
            <View style={styles.costRow}>
              <View style={styles.costInput}>
                <Text style={styles.modalLabel}>Labor Cost ($)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  value={statusUpdate.labor_cost}
                  onChangeText={(text) => setStatusUpdate({ ...statusUpdate, labor_cost: text })}
                  placeholder="150.00"
                />
              </View>
              <View style={styles.costInput}>
                <Text style={styles.modalLabel}>Parts Cost ($)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  value={statusUpdate.parts_cost}
                  onChangeText={(text) => setStatusUpdate({ ...statusUpdate, parts_cost: text })}
                  placeholder="450.00"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={updateStatus}
            >
              <Text style={styles.submitButtonText}>Update Status</Text>
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
  card: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  updateButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#C6C8EE',
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uptimeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  uptimeCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  uptimeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8df1d3',
  },
  uptimeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  historyItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#C6C8EE',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyNotes: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  historyPerformer: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  historyDuration: {
    fontSize: 11,
    color: '#888',
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
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  statusButtonActive: {
    backgroundColor: '#C6C8EE',
  },
  statusButtonText: {
    fontSize: 10,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  actionButtonActive: {
    backgroundColor: '#C6C8EE',
    borderColor: '#C6C8EE',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  costInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#C6C8EE',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**3. Add Navigation** (`codepop/App.js`):

```javascript
import MachineDetailScreen from './src/pages/MachineDetailScreen';

// Add to Stack.Navigator
<Stack.Screen
  name="MachineDetail"
  component={MachineDetailScreen}
  options={{ title: 'Machine Details' }}
/>
```

---

### Success Criteria

✅ Repair staff can view machine details
✅ Repair staff can update machine status from mobile
✅ Status update creates maintenance log
✅ Maintenance history displays correctly
✅ Uptime statistics shown
✅ UI intuitive and easy to use in field
✅ All navigation works correctly

---

## Phase 4 Documentation Deliverables

- [x] `docs/MACHINE_TRACKING.md` - Machine status tracking system
- [x] `docs/REPAIR_SCHEDULE.md` - Repair schedule CSV format
- [x] `docs/ROUTE_OPTIMIZATION.md` - Route optimization algorithm
- [ ] Update `docs/API.md` with Phase 4 endpoints
- [ ] Update `CLAUDE.md` with machine tracking details
- [ ] CSV templates in `docs/` folder

---

## Phase 4 Success Criteria

✅ Each store has exactly one machine
✅ Machine status tracked through all 7 states
✅ Status changes create maintenance logs
✅ Repair staff can upload CSV schedules
✅ Schedules can be viewed, modified, cancelled
✅ Route optimization reduces travel distance
✅ Nearest-neighbor TSP algorithm implemented
✅ Mobile interface functional for repair staff
✅ Machine status updates work from mobile
✅ Maintenance history accessible
✅ Uptime calculations accurate
✅ All tests pass with >80% coverage
✅ Documentation complete and accurate

---

## Next Phase Preview

**Phase 5: Enhanced Dashboards & Features**
- Enhanced manager dashboard (analytics, trends)
- Enhanced admin dashboard (system-wide metrics)
- User preference AI improvements
- Geolocation and proximity logic (Golden Window)
- Scheduled order functionality
- AI drink recommendation improvements
- Customer service chatbot enhancements
- Frontend polish

**Dependencies for Phase 5**:
- ✅ Role system (Phase 2)
- ✅ Supply system (Phase 3)
- ✅ Machine tracking (Phase 4)
- ✅ All backend infrastructure ready

---

**Phase 4 Complete!** 🎉

Continue to `PLAN_PHASE_5_DASHBOARDS.md` for the next phase.
