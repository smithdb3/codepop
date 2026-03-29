# Generated migration to seed roles and permissions

from django.db import migrations


def seed_permissions_and_roles(apps, schema_editor):
    """Seed initial permissions and built-in roles."""
    Permission = apps.get_model('backend', 'Permission')
    Role = apps.get_model('backend', 'Role')

    # Create all permissions
    permissions_data = [
        # User Management
        ('view_users', 'View Users', 'user_management'),
        ('manage_users', 'Manage Users', 'user_management'),
        ('manage_managers', 'Manage Managers', 'user_management'),
        ('reset_passwords', 'Reset Passwords', 'user_management'),

        # Roles & Permissions
        ('manage_roles', 'Manage Roles', 'roles_permissions'),
        ('manage_permissions', 'Manage Permissions', 'roles_permissions'),

        # System & Audit
        ('view_audit_logs', 'View Audit Logs', 'system_audit'),
        ('export_data', 'Export Data', 'system_audit'),
        ('system_settings', 'System Settings', 'system_audit'),

        # Orders & Inventory
        ('view_orders', 'View Orders', 'system_audit'),
        ('view_inventory', 'View Inventory', 'system_audit'),
        ('create_supply_req', 'Create Supply Request', 'system_audit'),
        ('approve_supply_req', 'Approve Supply Request', 'system_audit'),

        # Stores & Analytics
        ('manage_stores', 'Manage Stores', 'system_audit'),
        ('view_analytics', 'View Analytics', 'system_audit'),
    ]

    perms = {}
    for codename, label, category in permissions_data:
        perm, created = Permission.objects.get_or_create(
            codename=codename,
            defaults={'label': label, 'category': category}
        )
        perms[codename] = perm

    # Create built-in roles
    role_configs = [
        {
            'name': 'Super Admin',
            'perms': [k for k in perms.keys()],  # All permissions
        },
        {
            'name': 'Admin',
            'perms': [
                'view_users', 'manage_users', 'manage_managers',
                'reset_passwords', 'manage_roles', 'manage_permissions',
                'view_audit_logs', 'export_data', 'system_settings',
            ],
        },
        {
            'name': 'Manager',
            'perms': [
                'view_orders', 'view_inventory', 'create_supply_req',
                'view_analytics',
            ],
        },
        {
            'name': 'Repair Staff',
            'perms': [
                'view_orders', 'view_inventory',
            ],
        },
        {
            'name': 'Logistics Manager',
            'perms': [
                'view_inventory', 'approve_supply_req',
                'manage_stores', 'view_analytics',
            ],
        },
        {
            'name': 'Customer',
            'perms': [
                'view_orders',
            ],
        },
    ]

    for role_config in role_configs:
        role, created = Role.objects.get_or_create(
            name=role_config['name'],
            defaults={'is_builtin': True, 'description': f'{role_config["name"]} role'}
        )
        if created:
            # Add permissions to role
            permission_objects = [perms[perm_codename] for perm_codename in role_config['perms']]
            role.permissions.set(permission_objects)


def reverse_seed(apps, schema_editor):
    """Remove seeded data if migration is reversed."""
    Role = apps.get_model('backend', 'Role')
    Permission = apps.get_model('backend', 'Permission')

    # Delete only built-in roles and their associated permissions
    Role.objects.filter(is_builtin=True).delete()
    Permission.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_create_admin_models'),
    ]

    operations = [
        migrations.RunPython(seed_permissions_and_roles, reverse_seed),
    ]
