from django.core.management.base import BaseCommand
from backend.models import (
    Inventory, Drink, Preference, Region, StoreRegistry,
    Machine, Schedule, RepairStaffProfile, LogisticsManagerProfile,
    RepairRecord, MachinePart, MachineNote, MachinePhoto
)
from django.contrib.auth.models import User
from django.utils import timezone
import random
import datetime

class Command(BaseCommand):
    help = 'Populates the database with initial data'

    def handle(self, *args, **kwargs):
        # Creating some users
        super_user = User.objects.create_superuser(
            username='super',
            email='supertest@test.com',
            password='password',
            first_name='Lemonjello',
            last_name='Smith'
        )

        staff_user = User.objects.create_user(
            username='staff',
            email='staff@codepop.com',
            password= 'password',
            first_name = 'Orlando',
            is_staff = True,
            is_superuser = False
        )

        user1 = User.objects.create_user(
            username='test',
            email='test@test.com',
            password='password',
            first_name='Orangejello',
            last_name='Smith'
        )

        user2 = User.objects.create_user(
            username='test2',
            email='test@testing.com',
            password='password',
            first_name='Bob',
            last_name='Bobsford'
        )

        repair_user = User.objects.create_user(
            username='repair1',
            email='repair@codepop.com',
            password='password',
            first_name='Riley',
            last_name='Wrench'
        )

        logistics_user = User.objects.create_user(
            username='logistics1',
            email='logistics@codepop.com',
            password='password',
            first_name='Logan',
            last_name='Hub'
        )

         # Data to insert into the Inventory table
        sodas = [
            'Mtn. Dew', 'Diet Mtn. Dew', 'Dr. Pepper', 'Diet Dr. Pepper', 'Dr. Pepper Zero',
            'Dr Pepper Cream Soda', 'Sprite', 'Sprite Zero', 'Coke', 'Diet Coke', 'Coke Zero',
            'Pepsi', 'Diet Pepsi', 'Rootbeer', 'Fanta', 'Big Red', 'Powerade', 'Lemonade', 'Light Lemonade'
        ]
        syrups = [
            'Coconut', 'Pineapple', 'Strawberry', 'Raspberry', 'Blackberry', 'Blue Curacao', 'Passion Fruit',
            'Vanilla', 'Pomegranate', 'Peach', 'Grapefruit', 'Green Apple', 'Pear', 'Cherry', 'Cupcake',
            'Orange', 'Blood Orange', 'Mango', 'Cranberry', 'Blue Raspberry', 'Grape', 'Sour', 'Kiwi', 
            'Chocolate', 'Milano', 'Huckleberry', 'Sweetened Lime', 'Mojito', 'Lemon Lime', 'Cinnamon',
            'Watermelon', 'Guava', 'Banana', 'Lavender', 'Cucumber', 'Salted Caramel', 'Choc Chip Cookie Dough',
            'Brown Sugar Cinnamon', 'Hazelnut', 'Pumpkin Spice', 'Peppermint', 'Irish Cream', 'Gingerbread',
            'White Chocolate', 'Butterscotch', 'Bubble Gum', 'Cotton Candy', 'Butterbrew Mix'
        ]
        add_ins = [
            'Cream', 'Coconut Cream', 'Whip', 'Lemon Wedge', 'Lime Wedge', 'French Vanilla Creamer',
            'Candy Sprinkles', 'Strawberry Puree', 'Peach Puree', 'Mango Puree', 'Raspberry Puree'
        ]
        physical_items = ['Large Cups', 'Med Cups', 'Small Cups', 'Large Lids', 'Small Lids', 'Straws']

        # Function to generate random quantity and a close threshold
        def generate_inventory_data(item_name, item_type):
            quantity = random.randint(50, 100)  # Random quantity between 50 and 500
            threshold = quantity - random.randint(1, 10)  # Threshold slightly below quantity
            return {
                'ItemName': item_name,
                'ItemType': item_type,
                'Quantity': quantity,
                'ThresholdLevel': threshold
            }
        

        # Inserting sodas
        for soda in sodas:
            Inventory.objects.create(**generate_inventory_data(soda, 'Soda'))

        # Inserting syrups
        for syrup in syrups:
            Inventory.objects.create(**generate_inventory_data(syrup, 'Syrup'))

        # Inserting add-ins
        for add_in in add_ins:
            Inventory.objects.create(**generate_inventory_data(add_in, 'Add In'))

        for physical_item in physical_items:
            Inventory.objects.create(**generate_inventory_data(physical_item, 'Physical Item'))

        

        # Populating Drinks
        drink_data = [
            {
                'Name': 'Coke Float', #Better than a Coke Sink hahahaha :(
                'SyrupsUsed': ['Vanilla'],
                'SodaUsed': ['Coke'],
                'AddIns': ['Cream'],
                'Price': 5.99,
                'User_Created': False,
            },
            {
                'Name' : 'Seasonal Depression',
                'SyrupsUsed' : ['Cinnamon', 'Chocolate', 'Pumpkin Spice', 'Cucumber'],
                'SodaUsed' : ['Rootbeer'],
                'AddIns' : ['Candy Sprinkles'],
                'Rating' : 0.0,
                'Price' : 4.99, #should really cost your soul and dignity but I can't represent that in a float.
                'User_Created' : False
            },
            {
                'Name' : 'I\'ve Heard It Both Ways', #Shawn isn't this just a pina colda thing... 
                'SyrupsUsed' : ['Pineapple', 'Bubble Gum', 'Cotton Candy'],
                'SodaUsed' : ['Dr. Pepper'],
                'AddIns' : ['Lime Wedge'],
                'Price' : 2.50, 
                'User_Created' : False
            },
            {
                'Name' : 'Fall Girlie', 
                'SyrupsUsed' : ['Pumpkin Spice', 'Salted Caramel'],
                'SodaUsed' : ['Dr. Pepper'],
                'AddIns' : ['Whip', 'Candy Sprinkles'],
                'Price' : 2.50, #Also have to agree to go to a pumpkin patch and take fall pictures but again not able to be represented by a float... also costs a little dignity
                'User_Created' : False
            },
            {
                'Name' : 'Red Rizz', 
                'SyrupsUsed' : ['Peach', 'Cranberry'],
                'SodaUsed' : ['Big Red'],
                'AddIns' : ['Peach Puree'],
                'Price' : 2.50, #I was told that this was straight bussin no cap soooooooooo
                'User_Created' : False
            },
            {
                'Name' : '#Lemons',
                'SyrupsUsed' : ['Huckleberry'],
                'SodaUsed' : ['Lemonade'],
                'AddIns' : [],
                'Price' : 2.50, 
                'User_Created' : False
            }
            ]
        for drink in drink_data:
            Drink.objects.create(**drink)

        # Populating Preferences
        preferences = [
            {'UserID': user1, 'Preference': 'mango'},
            {'UserID': user1, 'Preference': 'strawberry'},
            {'UserID': user1, 'Preference': 'mtn. dew'},
            
            {'UserID': user2, 'Preference': 'peach'},
            {'UserID': user2, 'Preference': 'pumpkin_spice'},
            {'UserID': user2, 'Preference': 'dr. pepper'},

            {'UserID': super_user, 'Preference': 'pear'},
            {'UserID': super_user, 'Preference': 'cherry'},
            {'UserID': super_user, 'Preference': 'cupcake'},
            {'UserID': super_user, 'Preference': 'rootbeer'},
        ]
        for pref in preferences:
            Preference.objects.create(**pref)

        # Seeding Regions
        regions_data = [
            {'name': 'logan',     'display_name': 'Logan, UT',      'hub_api_endpoint': 'http://hub-logan.codepop.local:8000'},
            {'name': 'atlanta',   'display_name': 'Atlanta, GA',    'hub_api_endpoint': 'http://hub-atlanta.codepop.local:8000'},
            {'name': 'chicago',   'display_name': 'Chicago, IL',    'hub_api_endpoint': 'http://hub-chicago.codepop.local:8000'},
            {'name': 'newjersey', 'display_name': 'New Jersey, NY', 'hub_api_endpoint': 'http://hub-newjersey.codepop.local:8000'},
            {'name': 'dallas',    'display_name': 'Dallas, TX',     'hub_api_endpoint': 'http://hub-dallas.codepop.local:8000'},
            {'name': 'phoenix',   'display_name': 'Phoenix, AZ',    'hub_api_endpoint': 'http://hub-phoenix.codepop.local:8000'},
            {'name': 'seattle',   'display_name': 'Seattle, WA',    'hub_api_endpoint': 'http://hub-seattle.codepop.local:8000'},
        ]
        regions_dict = {}
        for r in regions_data:
            region = Region.objects.create(**r)
            regions_dict[r['name']] = region

        # Seeding StoreRegistry (20 stores in Logan, 5 stores per neighboring region)
        # Requirements: 20 stores in Region C (Logan, UT) and min 5 stores per neighboring region
        store_coords = {
            'logan': [
                (41.7370, -111.8887), (41.7480, -111.8950), (41.7550, -111.9050),
                (41.7300, -111.8750), (41.7450, -111.8850), (41.7600, -111.8900),
                (41.7250, -111.9100), (41.7400, -111.9200), (41.7650, -111.9000),
                (41.7320, -111.8600), (41.7500, -111.8700), (41.7680, -111.8800),
                (41.7220, -111.9300), (41.7420, -111.9400), (41.7620, -111.9100),
                (41.7380, -111.8500), (41.7520, -111.8550), (41.7700, -111.8650),
                (41.7280, -111.9500), (41.7480, -111.9600),
            ],
            'atlanta': [
                (33.7490, -84.3880), (33.7550, -84.3950), (33.7610, -84.4020),
                (33.7430, -84.3810), (33.7370, -84.3740),
            ],
            'chicago': [
                (41.8781, -87.6298), (41.8850, -87.6400), (41.8920, -87.6500),
                (41.8720, -87.6200), (41.8650, -87.6100),
            ],
            'newjersey': [
                (40.7128, -74.0060), (40.7200, -74.0150), (40.7270, -74.0240),
                (40.7060, -73.9970), (40.6990, -73.9880),
            ],
            'dallas': [
                (32.7767, -96.7970), (32.7850, -96.8050), (32.7920, -96.8130),
                (32.7690, -96.7890), (32.7620, -96.7810),
            ],
            'phoenix': [
                (33.4484, -112.0742), (33.4550, -112.0850), (33.4620, -112.0960),
                (33.4420, -112.0630), (33.4350, -112.0520),
            ],
            'seattle': [
                (47.6062, -122.3321), (47.6150, -122.3450), (47.6220, -122.3580),
                (47.5990, -122.3190), (47.5920, -122.3060),
            ],
        }
        store_id = 1
        for region_name, coords in store_coords.items():
            for idx, (lat, lon) in enumerate(coords):
                StoreRegistry.objects.create(
                    store_id=store_id,
                    store_name=f"CodePop {region_name.title()} #{idx + 1}",
                    region=region_name,
                    api_endpoint=f"http://store{store_id}.codepop.local:8000",
                    latitude=lat,
                    longitude=lon,
                    status='active' if idx == 0 else 'unreachable',
                )
                store_id += 1

        # Seeding Machines (one per status) with repair tracking fields
        now = timezone.now()
        machines_data = [
            {
                'machine_id': '1', 'name': 'Dispenser Alpha', 'location': 'Bay 1', 'status': 'NORMAL', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=730),  # 2 years ago
                'warranty_expiry': now.date() + datetime.timedelta(days=365),  # 1 year from now
                'last_repair_date': now - datetime.timedelta(days=30),
                'completion_estimate': None,
                'model_number': 'CP-3000', 'serial_number': 'SN-001-2024'
            },
            {
                'machine_id': '2', 'name': 'Dispenser Beta', 'location': 'Bay 2', 'status': 'WARNING', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=365),  # 1 year ago
                'warranty_expiry': now.date() + datetime.timedelta(days=730),  # 2 years from now
                'last_repair_date': now - datetime.timedelta(days=7),
                'completion_estimate': now + datetime.timedelta(days=2),
                'model_number': 'CP-3000', 'serial_number': 'SN-002-2024'
            },
            {
                'machine_id': '3', 'name': 'Dispenser Gamma', 'location': 'Bay 3', 'status': 'ERROR', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=1460),  # 4 years ago
                'warranty_expiry': now.date() - datetime.timedelta(days=90),  # expired 3 months ago
                'last_repair_date': now - datetime.timedelta(days=60),
                'completion_estimate': now + datetime.timedelta(days=5),
                'model_number': 'CP-2500', 'serial_number': 'SN-003-2023'
            },
            {
                'machine_id': '4', 'name': 'Dispenser Delta', 'location': 'Bay 4', 'status': 'OUT_OF_ORDER', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=1095),  # 3 years ago
                'warranty_expiry': now.date(),  # expires today
                'last_repair_date': now - datetime.timedelta(days=15),
                'completion_estimate': now + datetime.timedelta(days=3),
                'model_number': 'CP-3000', 'serial_number': 'SN-004-2024'
            },
            {
                'machine_id': '5', 'name': 'Dispenser Epsilon', 'location': 'Bay 5', 'status': 'SCHEDULE_SERVICE', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=550),  # ~1.5 years ago
                'warranty_expiry': now.date() + datetime.timedelta(days=180),  # 6 months from now
                'last_repair_date': now - datetime.timedelta(days=45),
                'completion_estimate': None,
                'model_number': 'CP-3000', 'serial_number': 'SN-005-2024'
            },
            {
                'machine_id': '6', 'name': 'Dispenser Zeta', 'location': 'Bay 6', 'status': 'REPAIR_START', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=730),  # 2 years ago
                'warranty_expiry': now.date() + datetime.timedelta(days=365),
                'last_repair_date': now - datetime.timedelta(days=1),
                'completion_estimate': now + datetime.timedelta(hours=12),
                'model_number': 'CP-3000', 'serial_number': 'SN-006-2024'
            },
            {
                'machine_id': '7', 'name': 'Dispenser Eta', 'location': 'Bay 7', 'status': 'REPAIR_END', 'store_id': 1,
                'install_date': now.date() - datetime.timedelta(days=1825),  # 5 years ago
                'warranty_expiry': now.date() - datetime.timedelta(days=365),  # expired 1 year ago
                'last_repair_date': now - datetime.timedelta(hours=2),
                'completion_estimate': None,
                'model_number': 'CP-2500', 'serial_number': 'SN-007-2023'
            },
        ]
        machines_dict = {}
        for m in machines_data:
            machine = Machine.objects.create(**m)
            machines_dict[m['machine_id']] = machine

        # Seeding RepairStaffProfile
        RepairStaffProfile.objects.create(
            user=repair_user,
            region=regions_dict['chicago'],
            assigned_store_id=1
        )

        # Seeding LogisticsManagerProfile
        LogisticsManagerProfile.objects.create(
            user=logistics_user,
            region=regions_dict['atlanta']
        )

        # Seeding Schedules
        schedules_data = [
            {
                'machine': machines_dict['1'],
                'assigned_to': repair_user,
                'scheduled_at': now + datetime.timedelta(days=7),
                'completed_at': None,
                'description': 'Routine maintenance and fluid check'
            },
            {
                'machine': machines_dict['2'],
                'assigned_to': repair_user,
                'scheduled_at': now - datetime.timedelta(days=2),
                'completed_at': now - datetime.timedelta(days=1),
                'description': 'Warning light investigation and reset'
            },
            {
                'machine': machines_dict['3'],
                'assigned_to': repair_user,
                'scheduled_at': now - datetime.timedelta(days=5),
                'completed_at': None,
                'description': 'Urgent: Error code 42 investigation'
            },
        ]
        for s in schedules_data:
            Schedule.objects.create(**s)

        # Seeding RepairRecords (repair history for machines)
        repair_records_data = [
            {
                'machine': machines_dict['1'],
                'technician': repair_user,
                'repair_type': 'Preventive Maintenance',
                'started_at': now - datetime.timedelta(days=30),
                'completed_at': now - datetime.timedelta(days=29, hours=23),
                'status': 'completed',
                'notes': 'Fluid levels checked and topped off. All seals intact.'
            },
            {
                'machine': machines_dict['2'],
                'technician': repair_user,
                'repair_type': 'Valve Replacement',
                'started_at': now - datetime.timedelta(days=7),
                'completed_at': now - datetime.timedelta(days=6, hours=22),
                'status': 'completed',
                'notes': 'Main dispenser valve replaced due to leakage. New valve model V-2024-A installed.'
            },
            {
                'machine': machines_dict['2'],
                'technician': repair_user,
                'repair_type': 'Dispenser Cleaning',
                'started_at': now - datetime.timedelta(days=1),
                'completed_at': None,
                'status': 'in_progress',
                'notes': 'Heavy residue buildup detected. Performing deep clean of all nozzles.'
            },
            {
                'machine': machines_dict['3'],
                'technician': repair_user,
                'repair_type': 'Motor Assembly Repair',
                'started_at': now - datetime.timedelta(days=60),
                'completed_at': None,
                'status': 'awaiting_parts',
                'notes': 'Motor assembly failure. Parts on order from supplier. ETA: 5 days.'
            },
            {
                'machine': machines_dict['6'],
                'technician': repair_user,
                'repair_type': 'Control Board Replacement',
                'started_at': now - datetime.timedelta(hours=1),
                'completed_at': None,
                'status': 'in_progress',
                'notes': 'Control board showing intermittent errors. Replacement unit installed, running diagnostics.'
            },
        ]
        for rr in repair_records_data:
            RepairRecord.objects.create(**rr)

        # Seeding MachineParts (compatible parts for machines)
        machine_parts_data = [
            {'machine': machines_dict['1'], 'part_name': 'Dispenser Valve Assembly', 'part_number': 'DV-2024-001', 'stock_qty': 3, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['1'], 'part_name': 'O-Ring Kit (Standard)', 'part_number': 'OR-KIT-001', 'stock_qty': 12, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['1'], 'part_name': 'Main Motor Assembly', 'part_number': 'MMA-3000-A', 'stock_qty': 0, 'eta_days': 7, 'is_compatible': True},
            {'machine': machines_dict['2'], 'part_name': 'Dispenser Valve Assembly', 'part_number': 'DV-2024-001', 'stock_qty': 3, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['2'], 'part_name': 'Control Board Module', 'part_number': 'CBM-2024-X', 'stock_qty': 1, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['3'], 'part_name': 'Main Motor Assembly', 'part_number': 'MMA-2500-B', 'stock_qty': 0, 'eta_days': 5, 'is_compatible': True},
            {'machine': machines_dict['3'], 'part_name': 'Pump Housing', 'part_number': 'PH-2500-001', 'stock_qty': 2, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['6'], 'part_name': 'Control Board Module', 'part_number': 'CBM-2024-X', 'stock_qty': 1, 'eta_days': None, 'is_compatible': True},
            {'machine': machines_dict['6'], 'part_name': 'Power Supply Unit', 'part_number': 'PSU-3000-V2', 'stock_qty': 0, 'eta_days': 3, 'is_compatible': True},
        ]
        for part in machine_parts_data:
            MachinePart.objects.create(**part)

        # Seeding MachineNotes (technician notes)
        machine_notes_data = [
            {'machine': machines_dict['1'], 'author': repair_user, 'content': 'Unit running smoothly. Scheduled next maintenance for 90 days.'},
            {'machine': machines_dict['1'], 'author': repair_user, 'content': 'Customer reported unusual noise from dispenser. Checked motor bearings—minor wear but within spec.'},
            {'machine': machines_dict['2'], 'author': repair_user, 'content': 'Valve leak detected during pressure test. Customer notified of replacement needed.'},
            {'machine': machines_dict['2'], 'author': repair_user, 'content': 'After valve replacement, tested at full pressure—all systems nominal.'},
            {'machine': machines_dict['2'], 'author': repair_user, 'content': 'High residue detected. Schedule deep cleaning before next use.'},
            {'machine': machines_dict['3'], 'author': repair_user, 'content': 'Motor assembly catastrophic failure. Unit inoperable. Parts sourced, ETA 5 days.'},
            {'machine': machines_dict['4'], 'author': repair_user, 'content': 'Warranty expired. Customer approved out-of-warranty repair. Parts quote sent.'},
            {'machine': machines_dict['6'], 'author': repair_user, 'content': 'Control board generating error code 42. Diagnostic test in progress.'},
            {'machine': machines_dict['6'], 'author': repair_user, 'content': 'Control board replacement installed. Running post-repair diagnostics now.'},
            {'machine': machines_dict['7'], 'author': repair_user, 'content': 'Unit returned to service after warranty-expired repair. Tested for 2 hours—stable.'},
        ]
        for note in machine_notes_data:
            MachineNote.objects.create(**note)

        # Seeding MachinePhotos (photo attachments)
        # Note: In production, these would be actual uploaded files. For seeding, we create records with placeholder paths.
        machine_photos_data = [
            {'machine': machines_dict['2'], 'photo': 'machine_photos/machine_2_valve_leak_001.jpg', 'uploaded_by': repair_user},
            {'machine': machines_dict['2'], 'photo': 'machine_photos/machine_2_valve_leak_002.jpg', 'uploaded_by': repair_user},
            {'machine': machines_dict['3'], 'photo': 'machine_photos/machine_3_motor_failure_001.jpg', 'uploaded_by': repair_user},
            {'machine': machines_dict['3'], 'photo': 'machine_photos/machine_3_motor_failure_002.jpg', 'uploaded_by': repair_user},
            {'machine': machines_dict['6'], 'photo': 'machine_photos/machine_6_control_board_damage.jpg', 'uploaded_by': repair_user},
            {'machine': machines_dict['7'], 'photo': 'machine_photos/machine_7_post_repair_test.jpg', 'uploaded_by': repair_user},
        ]
        for photo in machine_photos_data:
            MachinePhoto.objects.create(**photo)

        self.stdout.write(self.style.SUCCESS('Successfully populated the database.'))