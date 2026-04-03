# Generated migration for SeasonalDrink model

from django.db import migrations, models
import django.contrib.postgres.fields


def seed_spring_drinks(apps, schema_editor):
    SeasonalDrink = apps.get_model('backend', 'SeasonalDrink')
    spring_drinks = [
        {
            'name':        'Cherry Blossom Fizz',
            'description': 'A light, floral sip — cherry syrup meets sparkling cream soda with a hint of raspberry.',
            'image_url':   'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400',
            'season':      'spring',
            'price':       5.49,
            'soda':        'Cream Soda',
            'syrups':      ['Cherry', 'Raspberry'],
            'add_ins':     ['Coconut Cream'],
            'is_active':   True,
        },
        {
            'name':        'Strawberry Garden Lemonade',
            'description': 'Tangy lemonade base swirled with strawberry puree and a splash of peach.',
            'image_url':   'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400',
            'season':      'spring',
            'price':       4.99,
            'soda':        'Lemonade',
            'syrups':      ['Strawberry', 'Peach'],
            'add_ins':     ['Strawberry Puree'],
            'is_active':   True,
        },
        {
            'name':        'Lavender Mist',
            'description': 'Soft and dreamy — lavender syrup over sparkling Sprite with cucumber and lime.',
            'image_url':   'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
            'season':      'spring',
            'price':       5.25,
            'soda':        'Sprite',
            'syrups':      ['Lavender', 'Sweetened Lime'],
            'add_ins':     ['Cucumber', 'Lime Wedge'],
            'is_active':   True,
        },
        {
            'name':        'Mango Sunrise Splash',
            'description': 'Tropical mango and passion fruit ride a coconut cream wave over Mtn. Dew.',
            'image_url':   'https://images.unsplash.com/photo-1546173159-315724a31696?w=400',
            'season':      'spring',
            'price':       5.75,
            'soda':        'Mtn. Dew',
            'syrups':      ['Mango', 'Passion Fruit'],
            'add_ins':     ['Mango Puree', 'Coconut Cream'],
            'is_active':   True,
        },
        {
            'name':        'Pink Guava Spritz',
            'description': 'Guava and blood orange syrup sparkling over Sprite Zero for a guilt-free spring treat.',
            'image_url':   'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
            'season':      'spring',
            'price':       4.75,
            'soda':        'Sprite Zero',
            'syrups':      ['Guava', 'Blood Orange'],
            'add_ins':     [],
            'is_active':   True,
        },
        {
            'name':        'Honeydew Mint Refresher',
            'description': 'Cool mint and kiwi syrup over Dr. Pepper Cream Soda — crisp and unexpected.',
            'image_url':   'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400',
            'season':      'spring',
            'price':       5.25,
            'soda':        'Dr pepper cream soda',
            'syrups':      ['Kiwi'],
            'add_ins':     ['Whip'],
            'is_active':   True,
        },
    ]
    for drink_data in spring_drinks:
        SeasonalDrink.objects.create(**drink_data)


def reverse_seed(apps, schema_editor):
    SeasonalDrink = apps.get_model('backend', 'SeasonalDrink')
    SeasonalDrink.objects.filter(season='spring').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0012_seed_admin_store'),
        ('backend', '0011_delivery_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='SeasonalDrink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.CharField(blank=True, max_length=500)),
                ('image_url', models.URLField(blank=True)),
                ('season', models.CharField(
                    choices=[('spring','Spring'),('summer','Summer'),('fall','Fall'),('winter','Winter')],
                    default='spring', max_length=10)),
                ('price', models.FloatField()),
                ('soda', models.CharField(max_length=255)),
                ('syrups', django.contrib.postgres.fields.ArrayField(
                    base_field=models.CharField(max_length=255),
                    blank=True, default=list, size=None)),
                ('add_ins', django.contrib.postgres.fields.ArrayField(
                    base_field=models.CharField(max_length=255),
                    blank=True, default=list, size=None)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.RunPython(seed_spring_drinks, reverse_seed),
    ]
