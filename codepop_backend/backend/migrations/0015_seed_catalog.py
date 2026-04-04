# Migration to seed Inventory and Regions, and purge fake seeded stores

from django.db import migrations

SODAS = [
    'Mtn. Dew', 'Diet Mtn. Dew', 'Dr. Pepper', 'Diet Dr. Pepper', 'Dr. Pepper Zero',
    'Dr Pepper Cream Soda', 'Sprite', 'Sprite Zero', 'Coke', 'Diet Coke', 'Coke Zero',
    'Pepsi', 'Diet Pepsi', 'Rootbeer', 'Fanta', 'Big Red', 'Powerade', 'Lemonade', 'Light Lemonade',
]
SYRUPS = [
    'Coconut', 'Pineapple', 'Strawberry', 'Raspberry', 'Blackberry', 'Blue Curacao', 'Passion Fruit',
    'Vanilla', 'Pomegranate', 'Peach', 'Grapefruit', 'Green Apple', 'Pear', 'Cherry', 'Cupcake',
    'Orange', 'Blood Orange', 'Mango', 'Cranberry', 'Blue Raspberry', 'Grape', 'Sour', 'Kiwi',
    'Chocolate', 'Milano', 'Huckleberry', 'Sweetened Lime', 'Mojito', 'Lemon Lime', 'Cinnamon',
    'Watermelon', 'Guava', 'Banana', 'Lavender', 'Cucumber', 'Salted Caramel', 'Choc Chip Cookie Dough',
    'Brown Sugar Cinnamon', 'Hazelnut', 'Pumpkin Spice', 'Peppermint', 'Irish Cream', 'Gingerbread',
    'White Chocolate', 'Butterscotch', 'Bubble Gum', 'Cotton Candy', 'Butterbrew Mix',
]
ADD_INS = [
    'Cream', 'Coconut Cream', 'Whip', 'Lemon Wedge', 'Lime Wedge', 'French Vanilla Creamer',
    'Candy Sprinkles', 'Strawberry Puree', 'Peach Puree', 'Mango Puree', 'Raspberry Puree',
]
PHYSICAL_ITEMS = ['Large Cups', 'Med Cups', 'Small Cups', 'Large Lids', 'Small Lids', 'Straws']

REGIONS = [
    {'name': 'logan',     'display_name': 'Logan, UT',      'hub_api_endpoint': 'http://hub-logan.codepop.local:8000'},
    {'name': 'atlanta',   'display_name': 'Atlanta, GA',    'hub_api_endpoint': 'http://hub-atlanta.codepop.local:8000'},
    {'name': 'chicago',   'display_name': 'Chicago, IL',    'hub_api_endpoint': 'http://hub-chicago.codepop.local:8000'},
    {'name': 'newjersey', 'display_name': 'New Jersey, NY', 'hub_api_endpoint': 'http://hub-newjersey.codepop.local:8000'},
    {'name': 'dallas',    'display_name': 'Dallas, TX',     'hub_api_endpoint': 'http://hub-dallas.codepop.local:8000'},
    {'name': 'phoenix',   'display_name': 'Phoenix, AZ',    'hub_api_endpoint': 'http://hub-phoenix.codepop.local:8000'},
    {'name': 'seattle',   'display_name': 'Seattle, WA',    'hub_api_endpoint': 'http://hub-seattle.codepop.local:8000'},
]


def remove_fake_stores(apps, schema_editor):
    """Delete StoreRegistry rows seeded by populate_db (identified by .codepop.local endpoints)."""
    from django.conf import settings
    # Skip during test runs
    if getattr(settings, 'TESTING', False):
        return

    StoreRegistry = apps.get_model('backend', 'StoreRegistry')
    StoreRegistry.objects.filter(api_endpoint__contains='.codepop.local').delete()


def seed_catalog(apps, schema_editor):
    """Seed Inventory (sodas, syrups, add-ins, physical items) and Region data."""
    from django.conf import settings
    # Skip during test runs
    if getattr(settings, 'TESTING', False):
        return

    Inventory = apps.get_model('backend', 'Inventory')
    Region = apps.get_model('backend', 'Region')

    for name in SODAS:
        Inventory.objects.get_or_create(ItemName=name, ItemType='Soda',
                                        defaults={'Quantity': 100, 'ThresholdLevel': 90})
    for name in SYRUPS:
        Inventory.objects.get_or_create(ItemName=name, ItemType='Syrup',
                                        defaults={'Quantity': 100, 'ThresholdLevel': 90})
    for name in ADD_INS:
        Inventory.objects.get_or_create(ItemName=name, ItemType='Add In',
                                        defaults={'Quantity': 100, 'ThresholdLevel': 90})
    for name in PHYSICAL_ITEMS:
        Inventory.objects.get_or_create(ItemName=name, ItemType='Physical Item',
                                        defaults={'Quantity': 100, 'ThresholdLevel': 90})

    for r in REGIONS:
        Region.objects.get_or_create(name=r['name'], defaults={
            'display_name': r['display_name'],
            'hub_api_endpoint': r['hub_api_endpoint'],
        })


def reverse_seed(apps, schema_editor):
    """Reverse: delete seeded Inventory and Region rows."""
    Inventory = apps.get_model('backend', 'Inventory')
    Region = apps.get_model('backend', 'Region')
    all_names = SODAS + SYRUPS + ADD_INS + PHYSICAL_ITEMS
    Inventory.objects.filter(ItemName__in=all_names).delete()
    Region.objects.filter(name__in=[r['name'] for r in REGIONS]).delete()


def noop(apps, schema_editor):
    """No-op for reverse of fake store removal."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0014_visitingusercache_favorite_drinks'),
    ]

    operations = [
        migrations.RunPython(remove_fake_stores, noop),
        migrations.RunPython(seed_catalog, reverse_seed),
    ]
