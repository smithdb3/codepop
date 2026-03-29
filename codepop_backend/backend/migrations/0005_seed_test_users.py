# Generated migration to seed test users for each dashboard

from django.db import migrations
from django.contrib.auth.hashers import make_password


def seed_test_users(apps, schema_editor):
    """Create test users for each dashboard with appropriate roles and permissions."""
    User = apps.get_model('auth', 'User')
    Role = apps.get_model('backend', 'Role')
    UserProfile = apps.get_model('backend', 'UserProfile')
    Region = apps.get_model('backend', 'Region')
    StoreRegistry = apps.get_model('backend', 'StoreRegistry')
    RepairStaffProfile = apps.get_model('backend', 'RepairStaffProfile')
    LogisticsManagerProfile = apps.get_model('backend', 'LogisticsManagerProfile')
    ManagerProfile = apps.get_model('backend', 'ManagerProfile')

    # Get regions
    logan_region = Region.objects.filter(name='logan').first()
    if not logan_region:
        logan_region = Region.objects.first()

    # Get a store for testing
    test_store = StoreRegistry.objects.first()

    # Test users to create
    test_users = [
        {
            'username': 'superadmin',
            'email': 'superadmin@codepop.local',
            'first_name': 'Super',
            'last_name': 'Admin',
            'password': 'superadmin123',
            'role_name': 'Super Admin',
            'is_superuser': True,
            'is_staff': True,
            'region': logan_region,
        },
        {
            'username': 'admin',
            'email': 'admin@codepop.local',
            'first_name': 'Admin',
            'last_name': 'User',
            'password': 'admin123',
            'role_name': 'Admin',
            'is_superuser': False,
            'is_staff': True,
            'region': logan_region,
        },
        {
            'username': 'manager',
            'email': 'manager@codepop.local',
            'first_name': 'Store',
            'last_name': 'Manager',
            'password': 'manager123',
            'role_name': 'Manager',
            'is_superuser': False,
            'is_staff': False,
            'region': logan_region,
            'profile_type': 'manager',
            'store': test_store,
        },
        {
            'username': 'repairstaff',
            'email': 'repair@codepop.local',
            'first_name': 'Repair',
            'last_name': 'Technician',
            'password': 'repair123',
            'role_name': 'Repair Staff',
            'is_superuser': False,
            'is_staff': False,
            'region': logan_region,
            'profile_type': 'repair',
            'store': test_store,
        },
        {
            'username': 'logistics',
            'email': 'logistics@codepop.local',
            'first_name': 'Logistics',
            'last_name': 'Manager',
            'password': 'logistics123',
            'role_name': 'Logistics Manager',
            'is_superuser': False,
            'is_staff': False,
            'region': logan_region,
            'profile_type': 'logistics',
        },
    ]

    for test_user_data in test_users:
        # Create Django user
        user, created = User.objects.get_or_create(
            username=test_user_data['username'],
            defaults={
                'email': test_user_data['email'],
                'first_name': test_user_data['first_name'],
                'last_name': test_user_data['last_name'],
                'is_superuser': test_user_data['is_superuser'],
                'is_staff': test_user_data['is_staff'],
            }
        )

        if created:
            user.password = make_password(test_user_data['password'])
            user.save()

        # Refetch user to ensure fresh instance
        user = User.objects.get(username=test_user_data['username'])

        # Create UserProfile
        role = Role.objects.filter(name=test_user_data['role_name']).first()
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': role,
                'region': test_user_data.get('region'),
                'is_deleted': False,
            }
        )

        # Create role-specific profiles
        profile_type = test_user_data.get('profile_type')
        if profile_type == 'manager':
            store = test_user_data.get('store')
            ManagerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'region': test_user_data.get('region'),
                    'assigned_store': store,
                }
            )
        elif profile_type == 'repair':
            store = test_user_data.get('store')
            repair_defaults = {
                'region': test_user_data.get('region'),
            }
            if store and hasattr(store, 'id'):
                repair_defaults['assigned_store_id'] = store.id
            RepairStaffProfile.objects.get_or_create(
                user=user,
                defaults=repair_defaults
            )
        elif profile_type == 'logistics':
            LogisticsManagerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'region': test_user_data.get('region'),
                }
            )


def reverse_seed(apps, schema_editor):
    """Remove seeded test users if migration is reversed."""
    User = apps.get_model('auth', 'User')
    test_usernames = [
        'superadmin', 'admin', 'manager', 'repairstaff', 'logistics'
    ]
    User.objects.filter(username__in=test_usernames).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0004_seed_roles_permissions'),
    ]

    operations = [
        migrations.RunPython(seed_test_users, reverse_seed),
    ]
