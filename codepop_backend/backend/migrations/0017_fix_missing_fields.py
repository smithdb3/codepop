# Generated migration to add missing Machine fields, MachineRepairLog table, and SupplyHub.location

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0016_seed_catalog'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplyhub',
            name='location',
            field=models.CharField(blank=True, max_length=255, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='machine',
            name='serial_number',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='machine',
            name='model',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='machine',
            name='priority_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='machine',
            name='revenue_impact',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='machine',
            name='repair_state',
            field=models.CharField(blank=True, max_length=50, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='machine',
            name='estimated_completion',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='machine',
            name='last_note',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name='MachineRepairLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('issue_type', models.CharField(max_length=100)),
                ('duration_minutes', models.IntegerField(default=0)),
                ('outcome', models.CharField(choices=[('resolved', 'Resolved'), ('escalated', 'Escalated')], max_length=20)),
                ('diagnosis', models.TextField(blank=True)),
                ('steps_text', models.TextField(blank=True)),
                ('parts_replaced', models.JSONField(default=list)),
                ('machine', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='repair_logs', to='backend.machine')),
                ('technician', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
