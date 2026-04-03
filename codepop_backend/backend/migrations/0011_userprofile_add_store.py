# Migration to add store FK to UserProfile for scope enforcement

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0010_supply_request'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='store',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='admin_users',
                to='backend.storeregistry',
            ),
        ),
    ]
