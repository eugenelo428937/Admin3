"""
Migration to simplify cart product FK.

The actual DB changes were applied manually via SQL:
- Removed legacy product FK column (referenced ESSP)
- Renamed store_product_id to product_id
- Updated constraints

This migration is a no-op to record the model state change.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0028_alter_orderuseracknowledgment_acknowledgment_type'),
        ('store', '0002_migrate_product_data'),
    ]

    # DB changes were applied manually - this is just to record the state
    operations = []
