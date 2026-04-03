# Data migration to assign store to admin test user

from django.db import migrations


def assign_admin_store(apps, schema_editor):
    """Assign the first store to the admin test user's UserProfile."""
    UserProfile = apps.get_model('backend', 'UserProfile')
    StoreRegistry = apps.get_model('backend', 'StoreRegistry')
    User = apps.get_model('auth', 'User')

    try:
        admin_user = User.objects.get(username='admin')
        admin_profile = admin_user.admin_profile
        first_store = StoreRegistry.objects.first()
        if first_store:
            admin_profile.store = first_store
            admin_profile.save()
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        pass


def reverse_assign_admin_store(apps, schema_editor):
    """Reverse: remove store assignment from admin user."""
    UserProfile = apps.get_model('backend', 'UserProfile')
    User = apps.get_model('auth', 'User')

    try:
        admin_user = User.objects.get(username='admin')
        admin_profile = admin_user.admin_profile
        admin_profile.store = None
        admin_profile.save()
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0011_userprofile_add_store'),
    ]

    operations = [
        migrations.RunPython(assign_admin_store, reverse_assign_admin_store),
    ]
