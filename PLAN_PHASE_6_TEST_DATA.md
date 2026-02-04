# Phase 6: Comprehensive Test Data Generation (Week 14)

**Project**: CodePop P2P Distributed System
**Phase Duration**: 1 week
**Team Size**: 5 developers (coordinated effort)
**Dependencies**: All previous phases (0-5)

---

## Phase Overview

Generate comprehensive, realistic test data to validate the entire system. Create 7 supply hubs (Regions A-G), 35 stores (20 in Region C + 15 in neighboring regions), test users for all roles, sample inventory, orders, revenue, machines, and repair schedules. This data enables effective system demonstrations and validates all functionality.

### Goals
- ✅ Create 7 supply hubs (one per region)
- ✅ Create 35 stores (20 in Region C, 15 in neighboring regions)
- ✅ Generate test users for all 7 roles
- ✅ Populate inventory at stores and hubs
- ✅ Generate historical orders and revenue
- ✅ Create machines with maintenance histories
- ✅ Generate supply requests and deliveries
- ✅ Create repair schedules
- ✅ Generate usage data for AI forecasting
- ✅ Create CSV template files
- ✅ Build comprehensive seeding script

### Regional Distribution

```
Region A: Chicago, IL          - 1 hub + 0 test stores
Region B: New Jersey, NY        - 1 hub + 5 test stores
Region C: Logan, UT (PRIMARY)   - 1 hub + 20 test stores
Region D: Dallas, TX            - 1 hub + 5 test stores
Region E: Atlanta, GA           - 1 hub + 5 test stores
Region F: Phoenix, AZ           - 1 hub + 0 test stores
Region G: Boise, ID             - 1 hub + 0 test stores

Total: 7 hubs, 35 stores
```

---

## Task 6.1: Supply Hub and Region Data

**Priority**: MUST HAVE (M)
**Estimated Effort**: 1 day
**Assigned To**: Backend Developer 1

### Requirements
Create 7 supply hubs with realistic location data, contact information, and operational parameters. Each hub serves its designated region.

---

### Test Specifications (Write First!)

Create `backend/tests/test_data_generation.py`:

```python
class TestDataGenerationTests(TestCase):
    def test_all_regions_created(self):
        """Test all 7 regions exist"""
        # Run data generation
        call_command('generate_test_data')

        regions = Region.objects.all()
        self.assertEqual(regions.count(), 7)

        # Check specific regions
        region_codes = [r.region_code for r in regions]
        expected_codes = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
        for code in expected_codes:
            self.assertIn(code, region_codes)

    def test_all_supply_hubs_created(self):
        """Test all 7 supply hubs exist"""
        call_command('generate_test_data')

        hubs = SupplyHub.objects.all()
        self.assertEqual(hubs.count(), 7)

        # Check Region C hub
        region_c_hub = SupplyHub.objects.get(region__region_code='C')
        self.assertEqual(region_c_hub.city, 'Logan')
        self.assertEqual(region_c_hub.state, 'UT')

    def test_correct_store_distribution(self):
        """Test stores distributed correctly across regions"""
        call_command('generate_test_data')

        stores = Store.objects.all()
        self.assertEqual(stores.count(), 35)

        # Check Region C has 20 stores
        region_c_stores = Store.objects.filter(region__region_code='C')
        self.assertEqual(region_c_stores.count(), 20)

        # Check neighboring regions have 5 each
        region_b_stores = Store.objects.filter(region__region_code='B')
        self.assertEqual(region_b_stores.count(), 5)

    def test_each_store_has_machine(self):
        """Test each store has exactly one machine"""
        call_command('generate_test_data')

        stores = Store.objects.all()
        machines = Machine.objects.all()

        self.assertEqual(stores.count(), machines.count())

        # Check each store has machine
        for store in stores:
            self.assertTrue(hasattr(store, 'machine'))
            self.assertIsNotNone(store.machine)

    def test_all_roles_have_test_users(self):
        """Test users created for all 7 roles"""
        call_command('generate_test_data')

        # Check each role has at least one user
        roles = ['ACCOUNT_USER', 'GENERAL_USER', 'MANAGER', 'ADMIN',
                 'LOGISTICS_MANAGER', 'REPAIR_STAFF', 'SUPER_ADMIN']

        for role_type in roles:
            users = UserRole.objects.filter(role_type=role_type, is_active=True)
            self.assertGreater(users.count(), 0,
                             f"No users found for role {role_type}")

    def test_inventory_populated(self):
        """Test inventory exists for stores and hubs"""
        call_command('generate_test_data')

        # Check store inventory
        store_inventory = Inventory.objects.filter(store__isnull=False)
        self.assertGreater(store_inventory.count(), 0)

        # Check hub inventory
        hub_inventory = HubInventory.objects.all()
        self.assertGreater(hub_inventory.count(), 0)

    def test_historical_orders_generated(self):
        """Test historical orders exist"""
        call_command('generate_test_data')

        orders = Order.objects.all()
        self.assertGreater(orders.count(), 100)

        # Check orders span time period
        oldest_order = orders.order_by('PickupTime').first()
        newest_order = orders.order_by('-PickupTime').first()

        days_span = (newest_order.PickupTime - oldest_order.PickupTime).days
        self.assertGreaterEqual(days_span, 30)
```

---

### Implementation

**1. Create Data Generation Management Command** (`backend/management/commands/generate_test_data.py`):

```python
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime, time
from decimal import Decimal
import random
from backend.models import *


class Command(BaseCommand):
    help = 'Generate comprehensive test data for CodePop P2P system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before generating new data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            self.clear_data()

        self.stdout.write('Generating test data...')

        # Generate in order of dependencies
        self.create_regions()
        self.create_supply_hubs()
        self.create_stores()
        self.create_users()
        self.create_machines()
        self.create_inventory()
        self.create_hub_inventory()
        self.create_drinks()
        self.create_orders_and_revenue()
        self.create_supply_requests()
        self.create_repair_schedules()
        self.create_usage_data()
        self.create_maintenance_logs()

        self.stdout.write(self.style.SUCCESS('✅ Test data generation complete!'))
        self.print_summary()

    def clear_data(self):
        """Clear existing test data"""
        models_to_clear = [
            MaintenanceLog, RepairSchedule, UsageData, UsageForecast,
            SupplyDelivery, SupplyRequest, Revenue, Order, Drink,
            HubInventory, Inventory, Machine, UserRole, Store,
            SupplyHub, Region, User
        ]

        for model in models_to_clear:
            count = model.objects.all().delete()[0]
            if count > 0:
                self.stdout.write(f'  Cleared {count} {model.__name__} records')

    def create_regions(self):
        """Create 7 regions (A-G)"""
        self.stdout.write('Creating regions...')

        regions_data = [
            {
                'region_code': 'A',
                'name': 'Chicago, IL',
                'center_latitude': 41.8781,
                'center_longitude': -87.6298,
                'service_radius_miles': 200
            },
            {
                'region_code': 'B',
                'name': 'New Jersey, NY',
                'center_latitude': 40.7128,
                'center_longitude': -74.0060,
                'service_radius_miles': 150
            },
            {
                'region_code': 'C',
                'name': 'Logan, UT',
                'center_latitude': 41.7370,
                'center_longitude': -111.8338,
                'service_radius_miles': 100
            },
            {
                'region_code': 'D',
                'name': 'Dallas, TX',
                'center_latitude': 32.7767,
                'center_longitude': -96.7970,
                'service_radius_miles': 250
            },
            {
                'region_code': 'E',
                'name': 'Atlanta, GA',
                'center_latitude': 33.7490,
                'center_longitude': -84.3880,
                'service_radius_miles': 200
            },
            {
                'region_code': 'F',
                'name': 'Phoenix, AZ',
                'center_latitude': 33.4484,
                'center_longitude': -112.0740,
                'service_radius_miles': 180
            },
            {
                'region_code': 'G',
                'name': 'Boise, ID',
                'center_latitude': 43.6150,
                'center_longitude': -116.2023,
                'service_radius_miles': 120
            },
        ]

        for data in regions_data:
            region, created = Region.objects.get_or_create(
                region_code=data['region_code'],
                defaults=data
            )
            if created:
                self.stdout.write(f'  ✓ Created Region {region.region_code}: {region.name}')

    def create_supply_hubs(self):
        """Create 7 supply hubs (one per region)"""
        self.stdout.write('Creating supply hubs...')

        hubs_data = [
            {
                'region_code': 'A',
                'name': 'Chicago Supply Hub',
                'street_address': '123 Industrial Pkwy',
                'city': 'Chicago',
                'state': 'IL',
                'zip_code': '60601',
                'phone': '312-555-0001',
                'email': 'chicago@codepop.com',
                'latitude': 41.8781,
                'longitude': -87.6298,
            },
            {
                'region_code': 'B',
                'name': 'New Jersey Supply Hub',
                'street_address': '456 Commerce Blvd',
                'city': 'Newark',
                'state': 'NJ',
                'zip_code': '07102',
                'phone': '973-555-0002',
                'email': 'newjersey@codepop.com',
                'latitude': 40.7357,
                'longitude': -74.1724,
            },
            {
                'region_code': 'C',
                'name': 'Logan UT Supply Hub',
                'street_address': '789 Distribution Way',
                'city': 'Logan',
                'state': 'UT',
                'zip_code': '84321',
                'phone': '435-555-0003',
                'email': 'logan@codepop.com',
                'latitude': 41.7370,
                'longitude': -111.8338,
            },
            {
                'region_code': 'D',
                'name': 'Dallas Supply Hub',
                'street_address': '321 Logistics Dr',
                'city': 'Dallas',
                'state': 'TX',
                'zip_code': '75201',
                'phone': '214-555-0004',
                'email': 'dallas@codepop.com',
                'latitude': 32.7767,
                'longitude': -96.7970,
            },
            {
                'region_code': 'E',
                'name': 'Atlanta Supply Hub',
                'street_address': '654 Warehouse Rd',
                'city': 'Atlanta',
                'state': 'GA',
                'zip_code': '30303',
                'phone': '404-555-0005',
                'email': 'atlanta@codepop.com',
                'latitude': 33.7490,
                'longitude': -84.3880,
            },
            {
                'region_code': 'F',
                'name': 'Phoenix Supply Hub',
                'street_address': '987 Supply Center Ave',
                'city': 'Phoenix',
                'state': 'AZ',
                'zip_code': '85001',
                'phone': '602-555-0006',
                'email': 'phoenix@codepop.com',
                'latitude': 33.4484,
                'longitude': -112.0740,
            },
            {
                'region_code': 'G',
                'name': 'Boise Supply Hub',
                'street_address': '147 Depot St',
                'city': 'Boise',
                'state': 'ID',
                'zip_code': '83702',
                'phone': '208-555-0007',
                'email': 'boise@codepop.com',
                'latitude': 43.6150,
                'longitude': -116.2023,
            },
        ]

        for data in hubs_data:
            region = Region.objects.get(region_code=data.pop('region_code'))

            # Generate node config
            import uuid
            node_id = uuid.uuid4()

            hub, created = SupplyHub.objects.get_or_create(
                region=region,
                defaults={
                    **data,
                    'node_id': node_id,
                    'api_base_url': f'http://hub-{region.region_code.lower()}.codepop.local:8000',
                    'is_operational': True,
                    'max_delivery_distance_miles': 1000,
                }
            )
            if created:
                self.stdout.write(f'  ✓ Created {hub.name}')

    def create_stores(self):
        """Create 35 stores (20 in Region C, 5 each in B, D, E)"""
        self.stdout.write('Creating stores...')

        # Region C: 20 stores (PRIMARY TEST REGION)
        region_c = Region.objects.get(region_code='C')
        hub_c = SupplyHub.objects.get(region=region_c)

        logan_locations = [
            ('Logan Main Street', '100 N Main St', 41.7370, -111.8338),
            ('Logan University', '800 E 1200 N', 41.7480, -111.8100),
            ('Logan West', '1200 W 200 N', 41.7340, -111.8600),
            ('Logan South', '600 S Main St', 41.7250, -111.8340),
            ('Providence Store', '50 S Main St', 41.7060, -111.8170),
            ('Smithfield Store', '100 S Main St', 41.8390, -111.8320),
            ('Hyde Park Store', '25 Center St', 41.7990, -111.8190),
            ('Nibley Store', '2500 S Main St', 41.6730, -111.8330),
            ('North Logan Store', '1900 N Main St', 41.7690, -111.8050),
            ('River Heights Store', '500 E 500 S', 41.7200, -111.8100),
            ('Millville Store', '50 E Center St', 41.6810, -111.8230),
            ('Hyrum Store', '50 W Main St', 41.6340, -111.8520),
            ('Wellsville Store', '100 S Main St', 41.6380, -111.9330),
            ('Mendon Store', '25 N Main St', 41.7140, -111.9770),
            ('Lewiston Store', '50 S Main St', 41.9770, -111.8560),
            ('Richmond Store', '100 N State St', 41.9220, -111.8130),
            ('Trenton Store', '25 E Center St', 41.9300, -111.9330),
            ('Clarkston Store', '50 S Main St', 41.9110, -112.0510),
            ('Newton Store', '100 N Main St', 41.8670, -111.9910),
            ('Cornish Store', '25 Center St', 41.9670, -111.9550),
        ]

        for i, (name, address, lat, lon) in enumerate(logan_locations, 1):
            import uuid
            node_id = uuid.uuid4()

            store, created = Store.objects.get_or_create(
                store_number=f'LOGAN-{i:03d}',
                defaults={
                    'node_id': node_id,
                    'name': name,
                    'region': region_c,
                    'supply_hub': hub_c,
                    'street_address': address,
                    'city': 'Logan',
                    'state': 'UT',
                    'zip_code': '84321',
                    'phone': f'435-555-{1000+i}',
                    'email': f'logan{i}@codepop.com',
                    'latitude': lat,
                    'longitude': lon,
                    'api_base_url': f'http://store-logan-{i:03d}.codepop.local:800{i}',
                    'is_operational': True,
                    'is_accepting_orders': True,
                    'hours_of_operation': {
                        'monday': {'open': '06:00', 'close': '22:00'},
                        'tuesday': {'open': '06:00', 'close': '22:00'},
                        'wednesday': {'open': '06:00', 'close': '22:00'},
                        'thursday': {'open': '06:00', 'close': '22:00'},
                        'friday': {'open': '06:00', 'close': '23:00'},
                        'saturday': {'open': '07:00', 'close': '23:00'},
                        'sunday': {'open': '08:00', 'close': '20:00'},
                    }
                }
            )
            if created:
                self.stdout.write(f'  ✓ Created {store.store_number}: {store.name}')

        # Create stores in neighboring regions (5 each in B, D, E)
        neighboring_regions = [
            ('B', 'New Jersey', [
                ('Newark Downtown', 'Newark', 'NJ', 40.7357, -74.1724),
                ('Jersey City', 'Jersey City', 'NJ', 40.7178, -74.0431),
                ('Hoboken', 'Hoboken', 'NJ', 40.7439, -74.0324),
                ('Paterson', 'Paterson', 'NJ', 40.9168, -74.1718),
                ('Elizabeth', 'Elizabeth', 'NJ', 40.6639, -74.2107),
            ]),
            ('D', 'Dallas', [
                ('Dallas Downtown', 'Dallas', 'TX', 32.7767, -96.7970),
                ('Fort Worth', 'Fort Worth', 'TX', 32.7555, -97.3308),
                ('Arlington', 'Arlington', 'TX', 32.7357, -97.1081),
                ('Plano', 'Plano', 'TX', 33.0198, -96.6989),
                ('Irving', 'Irving', 'TX', 32.8140, -96.9489),
            ]),
            ('E', 'Atlanta', [
                ('Atlanta Downtown', 'Atlanta', 'GA', 33.7490, -84.3880),
                ('Marietta', 'Marietta', 'GA', 33.9526, -84.5499),
                ('Decatur', 'Decatur', 'GA', 33.7748, -84.2963),
                ('Roswell', 'Roswell', 'GA', 34.0232, -84.3616),
                ('Sandy Springs', 'Sandy Springs', 'GA', 33.9304, -84.3733),
            ]),
        ]

        for region_code, region_name, locations in neighboring_regions:
            region = Region.objects.get(region_code=region_code)
            hub = SupplyHub.objects.get(region=region)

            for i, (name, city, state, lat, lon) in enumerate(locations, 1):
                import uuid
                node_id = uuid.uuid4()

                store_number = f'{region_code}-{i:03d}'

                store, created = Store.objects.get_or_create(
                    store_number=store_number,
                    defaults={
                        'node_id': node_id,
                        'name': name,
                        'region': region,
                        'supply_hub': hub,
                        'street_address': f'{100*i} Main St',
                        'city': city,
                        'state': state,
                        'zip_code': '00000',
                        'phone': f'555-555-{i:04d}',
                        'email': f'{store_number.lower()}@codepop.com',
                        'latitude': lat,
                        'longitude': lon,
                        'api_base_url': f'http://store-{store_number.lower()}.codepop.local:8000',
                        'is_operational': True,
                        'is_accepting_orders': True,
                    }
                )
                if created:
                    self.stdout.write(f'  ✓ Created {store.store_number}: {store.name}')

    def create_users(self):
        """Create test users for all 7 roles"""
        self.stdout.write('Creating users...')

        # Super Admin
        super_admin, created = User.objects.get_or_create(
            username='superadmin',
            defaults={
                'email': 'superadmin@codepop.com',
                'first_name': 'Super',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            super_admin.set_password('admin123')
            super_admin.save()
            UserRole.objects.create(
                user=super_admin,
                role_type='SUPER_ADMIN'
            )
            self.stdout.write('  ✓ Created superadmin')

        # Logistics Managers (one per region with hub)
        regions_with_hubs = Region.objects.all()
        for region in regions_with_hubs:
            hub = SupplyHub.objects.get(region=region)
            username = f'logistics_{region.region_code.lower()}'

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@codepop.com',
                    'first_name': f'Logistics',
                    'last_name': f'Manager {region.region_code}',
                }
            )
            if created:
                user.set_password('logistics123')
                user.save()
                UserRole.objects.create(
                    user=user,
                    role_type='LOGISTICS_MANAGER',
                    region=region,
                    supply_hub=hub
                )
                self.stdout.write(f'  ✓ Created {username}')

        # Repair Staff (for Region C)
        region_c = Region.objects.get(region_code='C')
        repair_user, created = User.objects.get_or_create(
            username='repair_c',
            defaults={
                'email': 'repair_c@codepop.com',
                'first_name': 'Repair',
                'last_name': 'Staff',
            }
        )
        if created:
            repair_user.set_password('repair123')
            repair_user.save()
            UserRole.objects.create(
                user=repair_user,
                role_type='REPAIR_STAFF',
                region=region_c
            )
            self.stdout.write('  ✓ Created repair_c')

        # Store Managers and Admins (one of each for Region C stores)
        region_c_stores = Store.objects.filter(region__region_code='C')[:5]
        for i, store in enumerate(region_c_stores, 1):
            # Manager
            manager_username = f'manager_{store.store_number.lower()}'
            manager, created = User.objects.get_or_create(
                username=manager_username,
                defaults={
                    'email': f'{manager_username}@codepop.com',
                    'first_name': 'Manager',
                    'last_name': str(i),
                }
            )
            if created:
                manager.set_password('manager123')
                manager.save()
                UserRole.objects.create(
                    user=manager,
                    role_type='MANAGER',
                    store=store
                )
                self.stdout.write(f'  ✓ Created {manager_username}')

            # Admin
            admin_username = f'admin_{store.store_number.lower()}'
            admin, created = User.objects.get_or_create(
                username=admin_username,
                defaults={
                    'email': f'{admin_username}@codepop.com',
                    'first_name': 'Admin',
                    'last_name': str(i),
                }
            )
            if created:
                admin.set_password('admin123')
                admin.save()
                UserRole.objects.create(
                    user=admin,
                    role_type='ADMIN',
                    store=store
                )
                self.stdout.write(f'  ✓ Created {admin_username}')

        # Account Users (10 regular customers)
        for i in range(1, 11):
            username = f'user{i}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'user{i}@example.com',
                    'first_name': f'User',
                    'last_name': str(i),
                }
            )
            if created:
                user.set_password('user123')
                user.save()
                UserRole.objects.create(
                    user=user,
                    role_type='ACCOUNT_USER'
                )
                self.stdout.write(f'  ✓ Created {username}')

    def create_machines(self):
        """Create one machine per store"""
        self.stdout.write('Creating machines...')

        stores = Store.objects.all()
        for store in stores:
            machine, created = Machine.objects.get_or_create(
                store=store,
                defaults={
                    'serial_number': f'SR-{store.store_number}',
                    'machine_type': 'Soda Robot Model X',
                    'model_number': 'SR-1000',
                    'manufacturer': 'CodePop Industries',
                    'status': random.choice(['normal', 'normal', 'normal', 'warning']),  # Mostly normal
                    'installation_date': timezone.now().date() - timedelta(days=random.randint(30, 365)),
                    'warranty_expiration': timezone.now().date() + timedelta(days=random.randint(365, 730)),
                    'maintenance_interval_days': 90,
                    'total_drinks_made': random.randint(1000, 10000),
                    'total_runtime_hours': random.uniform(500, 5000),
                    'error_count': random.randint(0, 5),
                }
            )
            if created:
                self.stdout.write(f'  ✓ Created machine for {store.store_number}')

    def create_inventory(self):
        """Create inventory for all stores"""
        self.stdout.write('Creating store inventory...')

        items = [
            ('Cherry Syrup', 'Syrups', 100, 20),
            ('Vanilla Syrup', 'Syrups', 100, 20),
            ('Caramel Syrup', 'Syrups', 80, 15),
            ('Mint Syrup', 'Syrups', 60, 15),
            ('Chocolate Syrup', 'Syrups', 90, 20),
            ('Strawberry Syrup', 'Syrups', 70, 15),
            ('Cola Base', 'Sodas', 150, 30),
            ('Lemon-Lime Base', 'Sodas', 120, 25),
            ('Orange Base', 'Sodas', 100, 20),
            ('Root Beer Base', 'Sodas', 80, 20),
            ('Whipped Cream', 'Add-ins', 50, 10),
            ('Ice', 'Physical', 500, 100),
            ('Cups (Small)', 'Physical', 200, 40),
            ('Cups (Medium)', 'Physical', 200, 40),
            ('Cups (Large)', 'Physical', 200, 40),
            ('Lids', 'Physical', 300, 60),
            ('Straws', 'Physical', 400, 80),
        ]

        stores = Store.objects.all()
        for store in stores:
            for item_name, item_type, base_qty, threshold in items:
                # Add some randomness to quantities
                quantity = base_qty + random.randint(-30, 30)

                Inventory.objects.get_or_create(
                    store=store,
                    ItemName=item_name,
                    ItemType=item_type,
                    defaults={
                        'Quantity': max(0, quantity),
                        'ThresholdLevel': threshold,
                    }
                )

        self.stdout.write(f'  ✓ Created inventory for {stores.count()} stores')

    def create_hub_inventory(self):
        """Create inventory for supply hubs"""
        self.stdout.write('Creating hub inventory...')

        items = [
            ('Cherry Syrup', 'Syrups', 2000, 500),
            ('Vanilla Syrup', 'Syrups', 2000, 500),
            ('Caramel Syrup', 'Syrups', 1500, 400),
            ('Mint Syrup', 'Syrups', 1200, 300),
            ('Chocolate Syrup', 'Syrups', 1800, 400),
            ('Strawberry Syrup', 'Syrups', 1400, 350),
            ('Cola Base', 'Sodas', 3000, 750),
            ('Lemon-Lime Base', 'Sodas', 2500, 600),
            ('Orange Base', 'Sodas', 2000, 500),
            ('Root Beer Base', 'Sodas', 1600, 400),
            ('Whipped Cream', 'Add-ins', 1000, 250),
            ('Ice', 'Physical', 5000, 1000),
            ('Cups (Small)', 'Physical', 4000, 800),
            ('Cups (Medium)', 'Physical', 4000, 800),
            ('Cups (Large)', 'Physical', 4000, 800),
            ('Lids', 'Physical', 6000, 1200),
            ('Straws', 'Physical', 8000, 1600),
        ]

        hubs = SupplyHub.objects.all()
        for hub in hubs:
            for item_name, item_type, quantity, threshold in items:
                HubInventory.objects.get_or_create(
                    supply_hub=hub,
                    ItemName=item_name,
                    ItemType=item_type,
                    defaults={
                        'Quantity': quantity,
                        'ThresholdLevel': threshold,
                        'unit_cost': Decimal(random.uniform(2.0, 8.0)),
                    }
                )

        self.stdout.write(f'  ✓ Created inventory for {hubs.count()} hubs')

    def create_drinks(self):
        """Create sample drinks"""
        self.stdout.write('Creating drinks...')

        drinks_data = [
            ('Classic Cherry Cola', ['Cherry'], ['Cola Base'], [], 5.00, 'M', 'Regular', 4.5, False),
            ('Vanilla Dream', ['Vanilla'], ['Lemon-Lime Base'], [], 5.50, 'L', 'Regular', 4.7, False),
            ('Caramel Delight', ['Caramel'], ['Cola Base'], ['Whipped Cream'], 6.00, 'L', 'Light', 4.6, False),
            ('Mint Refresher', ['Mint'], ['Lemon-Lime Base'], [], 5.00, 'M', 'Regular', 4.3, False),
            ('Chocolate Frosty', ['Chocolate'], ['Root Beer Base'], ['Whipped Cream'], 6.50, 'L', 'Extra', 4.8, False),
        ]

        for name, syrups, sodas, addins, price, size, ice, rating, user_created in drinks_data:
            Drink.objects.get_or_create(
                Name=name,
                defaults={
                    'SyrupsUsed': syrups,
                    'SodaUsed': sodas,
                    'AddIns': addins,
                    'Price': Decimal(str(price)),
                    'Size': size,
                    'Ice_Amount': ice,
                    'Rating': rating,
                    'User_Created': user_created,
                }
            )

        self.stdout.write('  ✓ Created sample drinks')

    def create_orders_and_revenue(self):
        """Create historical orders and revenue (30 days)"""
        self.stdout.write('Creating orders and revenue...')

        stores = Store.objects.filter(region__region_code='C')  # Focus on Region C
        users = User.objects.filter(roles__role_type='ACCOUNT_USER')
        drinks = list(Drink.objects.all())

        if not drinks:
            self.stdout.write('  ⚠ No drinks found, skipping orders')
            return

        orders_created = 0
        for day in range(30):
            date = timezone.now().date() - timedelta(days=30-day)

            for store in stores:
                # 5-15 orders per day per store
                num_orders = random.randint(5, 15)

                for _ in range(num_orders):
                    hour = random.randint(6, 21)
                    minute = random.randint(0, 59)
                    pickup_time = timezone.make_aware(
                        datetime.combine(date, time(hour, minute))
                    )

                    order = Order.objects.create(
                        store=store,
                        UserID=random.choice(users) if users else None,
                        OrderStatus='completed',
                        PaymentStatus='paid',
                        PickupTime=pickup_time,
                        LockerCombo=str(random.randint(1000, 9999)),
                        StripeID=f'test_stripe_{random.randint(10000, 99999)}',
                    )

                    # Add 1-3 drinks to order
                    num_drinks = random.randint(1, 3)
                    total_amount = Decimal('0.00')

                    for _ in range(num_drinks):
                        drink = random.choice(drinks)
                        order.Drinks.add(drink)
                        total_amount += drink.Price

                    # Create revenue
                    Revenue.objects.create(
                        store=store,
                        order=order,
                        amount=total_amount,
                        transaction_date=pickup_time,
                        is_refund=False,
                    )

                    orders_created += 1

        self.stdout.write(f'  ✓ Created {orders_created} orders with revenue')

    def create_supply_requests(self):
        """Create sample supply requests"""
        self.stdout.write('Creating supply requests...')

        stores = Store.objects.filter(region__region_code='C')[:5]
        managers = User.objects.filter(roles__role_type='MANAGER')

        if not managers:
            self.stdout.write('  ⚠ No managers found, skipping supply requests')
            return

        for store in stores:
            manager = managers.filter(roles__store=store).first() or managers.first()

            # Create 2-3 requests per store
            for i in range(random.randint(2, 3)):
                urgency = random.choice(['NORMAL', 'NORMAL', 'URGENT', 'LOW'])
                status = random.choice(['PENDING', 'APPROVED', 'DELIVERED'])

                request = SupplyRequest.objects.create(
                    store=store,
                    supply_hub=store.supply_hub,
                    requested_by=manager,
                    urgency=urgency,
                    status=status,
                    items=[
                        {'item_name': 'Cherry Syrup', 'item_type': 'Syrups', 'quantity': 10, 'current_quantity': 15},
                        {'item_name': 'Cola Base', 'item_type': 'Sodas', 'quantity': 15, 'current_quantity': 25},
                    ],
                    notes='Regular restock' if urgency == 'NORMAL' else 'Urgent restock needed',
                )

                if status == 'APPROVED':
                    request.approved_at = timezone.now() - timedelta(days=random.randint(1, 5))
                    request.estimated_delivery_date = timezone.now().date() + timedelta(days=random.randint(1, 3))
                    request.save()

        self.stdout.write('  ✓ Created supply requests')

    def create_repair_schedules(self):
        """Create repair schedules for Region C"""
        self.stdout.write('Creating repair schedules...')

        stores = Store.objects.filter(region__region_code='C')[:10]
        repair_user = User.objects.filter(roles__role_type='REPAIR_STAFF').first()

        if not repair_user:
            self.stdout.write('  ⚠ No repair staff found, skipping schedules')
            return

        for store in stores:
            # Schedule maintenance 1-2 weeks out
            scheduled_date = timezone.now().date() + timedelta(days=random.randint(7, 14))

            RepairSchedule.objects.create(
                machine=store.machine,
                scheduled_by=repair_user,
                scheduled_date=scheduled_date,
                scheduled_time=time(9, 0),
                action_type='SCHEDULED_MAINTENANCE',
                estimated_duration_minutes=120,
                status='SCHEDULED',
                notes='Quarterly maintenance check',
            )

        self.stdout.write('  ✓ Created repair schedules')

    def create_usage_data(self):
        """Create usage data for AI forecasting"""
        self.stdout.write('Creating usage data...')

        stores = Store.objects.filter(region__region_code='C')[:5]
        hub_c = SupplyHub.objects.get(region__region_code='C')

        items = [
            ('Cherry Syrup', 'Syrups'),
            ('Vanilla Syrup', 'Syrups'),
            ('Cola Base', 'Sodas'),
        ]

        for day in range(30):
            date = timezone.now().date() - timedelta(days=30-day)

            for store in stores:
                for item_name, item_type in items:
                    # Usage varies by day of week
                    is_weekend = date.weekday() in [5, 6]
                    base_usage = 20 if is_weekend else 15

                    quantity_used = base_usage + random.randint(-5, 5)

                    UsageData.objects.create(
                        supply_hub=hub_c,
                        store_number=store.store_number,
                        region_code='C',
                        date=date,
                        item_name=item_name,
                        item_type=item_type,
                        quantity_used=quantity_used,
                        day_of_week=date.strftime('%A'),
                        week_of_year=date.isocalendar()[1],
                        month=date.month,
                    )

        self.stdout.write('  ✓ Created usage data for forecasting')

    def create_maintenance_logs(self):
        """Create maintenance history"""
        self.stdout.write('Creating maintenance logs...')

        machines = Machine.objects.filter(store__region__region_code='C')[:10]
        repair_user = User.objects.filter(roles__role_type='REPAIR_STAFF').first()

        if not repair_user:
            self.stdout.write('  ⚠ No repair staff found, skipping logs')
            return

        for machine in machines:
            # Create 1-3 maintenance logs per machine
            for _ in range(random.randint(1, 3)):
                timestamp = timezone.now() - timedelta(days=random.randint(1, 90))

                MaintenanceLog.objects.create(
                    machine=machine,
                    status='repair-end',
                    previous_status='normal',
                    action_type=random.choice(['SCHEDULED_MAINTENANCE', 'INSPECTION', 'CLEANING']),
                    performed_by=repair_user,
                    notes='Routine maintenance completed',
                    timestamp=timestamp,
                    duration_minutes=random.randint(60, 180),
                    labor_cost=Decimal(random.uniform(75.0, 150.0)),
                    parts_cost=Decimal(random.uniform(0.0, 100.0)),
                )

        self.stdout.write('  ✓ Created maintenance logs')

    def print_summary(self):
        """Print summary of generated data"""
        self.stdout.write('\n📊 Data Generation Summary:')
        self.stdout.write(f'  Regions: {Region.objects.count()}')
        self.stdout.write(f'  Supply Hubs: {SupplyHub.objects.count()}')
        self.stdout.write(f'  Stores: {Store.objects.count()}')
        self.stdout.write(f'    - Region C: {Store.objects.filter(region__region_code="C").count()}')
        self.stdout.write(f'  Users: {User.objects.count()}')
        self.stdout.write(f'  Machines: {Machine.objects.count()}')
        self.stdout.write(f'  Store Inventory Items: {Inventory.objects.count()}')
        self.stdout.write(f'  Hub Inventory Items: {HubInventory.objects.count()}')
        self.stdout.write(f'  Drinks: {Drink.objects.count()}')
        self.stdout.write(f'  Orders: {Order.objects.count()}')
        self.stdout.write(f'  Revenue Records: {Revenue.objects.count()}')
        self.stdout.write(f'  Supply Requests: {SupplyRequest.objects.count()}')
        self.stdout.write(f'  Repair Schedules: {RepairSchedule.objects.count()}')
        self.stdout.write(f'  Usage Data Records: {UsageData.objects.count()}')
        self.stdout.write(f'  Maintenance Logs: {MaintenanceLog.objects.count()}')
```

---

### Usage

```bash
# Generate all test data
python manage.py generate_test_data

# Clear existing data and regenerate
python manage.py generate_test_data --clear
```

---

### Success Criteria

✅ All 7 supply hubs created with correct locations
✅ 35 stores created (20 in Region C, 15 in neighbors)
✅ Each store has exactly one machine
✅ All 7 roles have test users
✅ Inventory populated at stores and hubs
✅ 30 days of historical orders generated
✅ Supply requests created and linked correctly
✅ Repair schedules generated for Region C
✅ Usage data available for AI forecasting
✅ Maintenance logs track machine history
✅ All data relationships valid
✅ Data generation script runs without errors
✅ Summary output shows correct counts

---

## Phase 6 Documentation Deliverables

- [x] `docs/TEST_DATA.md` - Test data structure and generation
- [ ] `docs/CSV_TEMPLATES/` - All CSV template files
- [ ] Update `README.md` with data generation instructions
- [ ] Create `.env.example` with test configuration

---

## Phase 6 Success Criteria

✅ Comprehensive test data covers all models
✅ Data generation script reliable and reproducible
✅ Regional distribution matches requirements
✅ All relationships between models valid
✅ Test users cover all 7 roles
✅ Historical data spans appropriate time period
✅ Data realistic enough for demos
✅ CSV templates provided for manual imports
✅ Documentation complete
✅ All tests pass

---

**Phase 6 Complete!** 🎉

Continue to `PLAN_PHASE_7_INTEGRATION.md` for final integration testing and deployment.
