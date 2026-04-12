# Generated migration to add RepairPart and PartOrder models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0017_fix_missing_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='RepairPart',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('part_number', models.CharField(max_length=100, unique=True)),
                ('part_name', models.CharField(max_length=200)),
                ('machine_model', models.CharField(max_length=100)),
                ('stock_status', models.CharField(choices=[('in_stock', 'In Stock'), ('order_pending', 'Order Pending'), ('back_order', 'Back Order')], max_length=20)),
                ('qty_available', models.IntegerField(default=0)),
                ('hub_location', models.CharField(blank=True, max_length=200)),
                ('eta', models.DateField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='PartOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('requested_date', models.DateField(auto_now_add=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('in_transit', 'In Transit'), ('delivered', 'Delivered')], default='pending', max_length=20)),
                ('eta', models.DateField(blank=True, null=True)),
                ('part', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='backend.repairpart')),
                ('requested_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
