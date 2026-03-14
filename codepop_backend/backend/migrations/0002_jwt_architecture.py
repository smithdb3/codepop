# Generated migration for JWT-based distributed architecture
# Simplifies UserCache to routing table, adds VisitingSession for JWT sessions

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('backend', '0001_initial'),
    ]

    operations = [
        # Add VisitingSession model
        migrations.CreateModel(
            name='VisitingSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('canonical_user_id', models.IntegerField(db_index=True)),
                ('home_store_id', models.IntegerField()),
                ('home_store_endpoint', models.CharField(max_length=500)),
                ('jwt_payload', models.JSONField()),
                ('jwt_expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('token', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='visiting_session', to='authtoken.token')),
            ],
        ),
        # Modify UserCache: remove user_data, rename source_store_id, update field indices
        migrations.RemoveField(
            model_name='usercache',
            name='user_data',
        ),
        migrations.RemoveField(
            model_name='usercache',
            name='synced_at',
        ),
        migrations.AlterField(
            model_name='usercache',
            name='user_email',
            field=models.CharField(db_index=True, max_length=255, unique=True),
        ),
        migrations.RenameField(
            model_name='usercache',
            old_name='source_store_id',
            new_name='home_store_id',
        ),
        migrations.AddField(
            model_name='usercache',
            name='cached_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
