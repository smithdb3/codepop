# Generated migration to seed the 7 regions

from django.db import migrations


def seed_regions(apps, schema_editor):
    """Create the 7 fixed regions."""
    Region = apps.get_model('backend', 'Region')
    regions = [
        ('logan', 'Logan, UT'),
        ('atlanta', 'Atlanta, GA'),
        ('chicago', 'Chicago, IL'),
        ('newjersey', 'New Jersey, NY'),
        ('dallas', 'Dallas, TX'),
        ('phoenix', 'Phoenix, AZ'),
        ('seattle', 'Seattle, WA'),
    ]
    for name, display_name in regions:
        Region.objects.get_or_create(
            name=name,
            defaults={'display_name': display_name, 'hub_api_endpoint': ''}
        )


def reverse_regions(apps, schema_editor):
    """Delete the seeded regions."""
    Region = apps.get_model('backend', 'Region')
    Region.objects.filter(name__in=[
        'logan', 'atlanta', 'chicago', 'newjersey', 'dallas', 'phoenix', 'seattle'
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0002_convert_models_to_foreign_keys'),
    ]

    operations = [
        migrations.RunPython(seed_regions, reverse_regions),
    ]
