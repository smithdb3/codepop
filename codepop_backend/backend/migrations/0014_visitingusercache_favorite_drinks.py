# Generated migration for VisitingUserCache.favorite_drinks

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0013_seasonal_drinks'),
    ]

    operations = [
        migrations.AddField(
            model_name='visitingusercache',
            name='favorite_drinks',
            field=models.JSONField(default=list),
        ),
    ]
