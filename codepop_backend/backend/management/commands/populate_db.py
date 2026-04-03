from django.core.management.base import BaseCommand
from backend.models import (
    Inventory, Drink, Preference, Region, StoreRegistry,
    Machine, Schedule, RepairStaffProfile, LogisticsManagerProfile
)
from django.contrib.auth.models import User
from django.utils import timezone
import random
import datetime

class Command(BaseCommand):
    help = 'Populates the database with initial data'

    def handle(self, *args, **kwargs):
        # Creating some users (use get_or_create to avoid duplicates)
        super_user, _ = User.objects.get_or_create(
            username='super',
            defaults={
                'email': 'supertest@test.com',
                'first_name': 'Lemonjello',
                'last_name': 'Smith',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if super_user.is_superuser == False:
            super_user.is_superuser = True
            super_user.is_staff = True
            super_user.set_password('password')
            super_user.save()

        staff_user, _ = User.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'staff@codepop.com',
                'first_name': 'Orlando',
                'is_staff': True,
                'is_superuser': False,
            }
        )
        staff_user.set_password('password')
        staff_user.save()

        user1, _ = User.objects.get_or_create(
            username='test',
            defaults={
                'email': 'test@test.com',
                'first_name': 'Orangejello',
                'last_name': 'Smith',
            }
        )
        user1.set_password('password')
        user1.save()

        user2, _ = User.objects.get_or_create(
            username='test2',
            defaults={
                'email': 'test@testing.com',
                'first_name': 'Bob',
                'last_name': 'Bobsford',
            }
        )
        user2.set_password('password')
        user2.save()

        repair_user, _ = User.objects.get_or_create(
            username='repair1',
            defaults={
                'email': 'repair@codepop.com',
                'first_name': 'Riley',
                'last_name': 'Wrench',
            }
        )
        repair_user.set_password('password')
        repair_user.save()

        logistics_user, _ = User.objects.get_or_create(
            username='logistics1',
            defaults={
                'email': 'logistics@codepop.com',
                'first_name': 'Logan',
                'last_name': 'Hub',
            }
        )
        logistics_user.set_password('password')
        logistics_user.save()

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
        

        # Inserting sodas (use get_or_create to avoid duplicates)
        for soda in sodas:
            Inventory.objects.get_or_create(
                ItemName=soda,
                ItemType='Soda',
                defaults={'Quantity': random.randint(50, 100), 'ThresholdLevel': random.randint(40, 90)}
            )

        # Inserting syrups
        for syrup in syrups:
            Inventory.objects.get_or_create(
                ItemName=syrup,
                ItemType='Syrup',
                defaults={'Quantity': random.randint(50, 100), 'ThresholdLevel': random.randint(40, 90)}
            )

        # Inserting add-ins
        for add_in in add_ins:
            Inventory.objects.get_or_create(
                ItemName=add_in,
                ItemType='Add In',
                defaults={'Quantity': random.randint(50, 100), 'ThresholdLevel': random.randint(40, 90)}
            )

        # Inserting physical items
        for physical_item in physical_items:
            Inventory.objects.get_or_create(
                ItemName=physical_item,
                ItemType='Physical Item',
                defaults={'Quantity': random.randint(50, 100), 'ThresholdLevel': random.randint(40, 90)}
            )

        

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
            Preference.objects.get_or_create(
                UserID=pref['UserID'],
                Preference=pref['Preference']
            )

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
            region, _ = Region.objects.get_or_create(
                name=r['name'],
                defaults={'display_name': r['display_name'], 'hub_api_endpoint': r['hub_api_endpoint']}
            )
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
                    region=regions_dict[region_name],
                    api_endpoint=f"http://store{store_id}.codepop.local:8000",
                    latitude=lat,
                    longitude=lon,
                    status='active' if idx == 0 else 'unreachable',
                )
                store_id += 1

        # Seeding Machines (one per status)
        machines_data = [
            {'machine_id': 'M001', 'name': 'Dispenser Alpha', 'location': 'Bay 1', 'status': 'NORMAL', 'store_id': 1},
            {'machine_id': 'M002', 'name': 'Dispenser Beta', 'location': 'Bay 2', 'status': 'WARNING', 'store_id': 1},
            {'machine_id': 'M003', 'name': 'Dispenser Gamma', 'location': 'Bay 3', 'status': 'ERROR', 'store_id': 1},
            {'machine_id': 'M004', 'name': 'Dispenser Delta', 'location': 'Bay 4', 'status': 'OUT_OF_ORDER', 'store_id': 1},
            {'machine_id': 'M005', 'name': 'Dispenser Epsilon', 'location': 'Bay 5', 'status': 'SCHEDULE_SERVICE', 'store_id': 1},
            {'machine_id': 'M006', 'name': 'Dispenser Zeta', 'location': 'Bay 6', 'status': 'REPAIR_START', 'store_id': 1},
            {'machine_id': 'M007', 'name': 'Dispenser Eta', 'location': 'Bay 7', 'status': 'REPAIR_END', 'store_id': 1},
        ]
        machines_dict = {}
        for m in machines_data:
            machine, _ = Machine.objects.get_or_create(
                machine_id=m['machine_id'],
                defaults={'name': m['name'], 'location': m['location'], 'status': m['status'], 'store_id': m['store_id']}
            )
            machines_dict[m['machine_id']] = machine

        # Seeding RepairStaffProfile
        RepairStaffProfile.objects.get_or_create(
            user=repair_user,
            defaults={'region': regions_dict['chicago'], 'assigned_store_id': 1}
        )

        # Seeding LogisticsManagerProfile
        LogisticsManagerProfile.objects.get_or_create(
            user=logistics_user,
            defaults={'region': regions_dict['atlanta']}
        )

        # Seeding Schedules
        now = timezone.now()
        schedules_data = [
            {
                'machine': machines_dict['M001'],
                'assigned_to': repair_user,
                'scheduled_at': now + datetime.timedelta(days=7),
                'completed_at': None,
                'description': 'Routine maintenance and fluid check'
            },
            {
                'machine': machines_dict['M002'],
                'assigned_to': repair_user,
                'scheduled_at': now - datetime.timedelta(days=2),
                'completed_at': now - datetime.timedelta(days=1),
                'description': 'Warning light investigation and reset'
            },
            {
                'machine': machines_dict['M003'],
                'assigned_to': repair_user,
                'scheduled_at': now - datetime.timedelta(days=5),
                'completed_at': None,
                'description': 'Urgent: Error code 42 investigation'
            },
        ]
        for s in schedules_data:
            Schedule.objects.create(**s)

        self.stdout.write(self.style.SUCCESS('Successfully populated the database.'))