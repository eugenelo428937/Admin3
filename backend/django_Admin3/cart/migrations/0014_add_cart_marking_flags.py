# Generated migration for cart marking flags

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0013_rename_acknowledgments_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='cart',
            name='has_marking',
            field=models.BooleanField(default=False, help_text='Indicates if cart contains marking products'),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='has_expired_deadline',
            field=models.BooleanField(default=False, help_text='Indicates if marking product has expired deadlines'),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='is_marking',
            field=models.BooleanField(default=False, help_text='Indicates if this is a marking product'),
        ),
    ]