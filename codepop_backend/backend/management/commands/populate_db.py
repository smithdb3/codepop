from django.core.management.base import BaseCommand
from backend.models import Inventory, Drink, Preference
from django.contrib.auth.models import User
import random

class Command(BaseCommand):
    help = 'Populates the database with initial data'

    def handle(self, *args, **kwargs):
        # Creating some users (idempotent: skip if already exist)
        super_user, _ = User.objects.get_or_create(
            username='super',
            defaults={
                'email': 'supertest@test.com',
                'first_name': 'Lemonjello',
                'last_name': 'Smith',
            }
        )
        super_user.set_password('password')
        super_user.is_superuser = True
        super_user.is_staff = True
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
        staff_user.is_staff = True
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
        

        # Inserting sodas (idempotent)
        for soda in sodas:
            data = generate_inventory_data(soda, 'Soda')
            Inventory.objects.get_or_create(
                ItemName=soda, ItemType='Soda',
                defaults={'Quantity': data['Quantity'], 'ThresholdLevel': data['ThresholdLevel']}
            )

        # Inserting syrups
        for syrup in syrups:
            data = generate_inventory_data(syrup, 'Syrup')
            Inventory.objects.get_or_create(
                ItemName=syrup, ItemType='Syrup',
                defaults={'Quantity': data['Quantity'], 'ThresholdLevel': data['ThresholdLevel']}
            )

        # Inserting add-ins
        for add_in in add_ins:
            data = generate_inventory_data(add_in, 'Add In')
            Inventory.objects.get_or_create(
                ItemName=add_in, ItemType='Add In',
                defaults={'Quantity': data['Quantity'], 'ThresholdLevel': data['ThresholdLevel']}
            )

        for physical_item in physical_items:
            data = generate_inventory_data(physical_item, 'Physical')
            Inventory.objects.get_or_create(
                ItemName=physical_item, ItemType='Physical',
                defaults={'Quantity': data['Quantity'], 'ThresholdLevel': data['ThresholdLevel']}
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
            Drink.objects.get_or_create(
                Name=drink['Name'], User_Created=False,
                defaults={
                    'SyrupsUsed': drink.get('SyrupsUsed', []),
                    'SodaUsed': drink.get('SodaUsed', []),
                    'AddIns': drink.get('AddIns', []),
                    'Rating': drink.get('Rating'),
                    'Price': drink['Price'],
                }
            )

        # Populating Preferences (idempotent)
        preferences = [
            {'UserID': user1, 'Preference': 'mango'},
            {'UserID': user1, 'Preference': 'strawberry'},
            {'UserID': user1, 'Preference': 'mtn. dew'},
            {'UserID': user2, 'Preference': 'peach'},
            {'UserID': user2, 'Preference': 'pumpkin spice'},
            {'UserID': user2, 'Preference': 'dr. pepper'},
            {'UserID': super_user, 'Preference': 'pear'},
            {'UserID': super_user, 'Preference': 'cherry'},
            {'UserID': super_user, 'Preference': 'cupcake'},
            {'UserID': super_user, 'Preference': 'rootbeer'},
        ]
        for pref in preferences:
            Preference.objects.get_or_create(
                UserID=pref['UserID'], Preference=pref['Preference']
            )

        self.stdout.write(self.style.SUCCESS('Successfully populated the database.'))