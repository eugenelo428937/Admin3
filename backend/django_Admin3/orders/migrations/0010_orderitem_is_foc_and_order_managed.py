"""
Flip Order model to managed=True and add OrderItem.is_foc.

The "acted"."orders" table already exists in the database (created via raw
SQL in orders/migrations/0001_initial.py). We only register the `user`
ForeignKey in Django's migration state so the autodetector stops trying to
recreate the FK now that the model is managed. The `is_foc` column on
"acted"."order_items" is a new field and runs a real ALTER TABLE.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0009_sync_orderitem_purchasable_help_text"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Flip Order to managed=True so Django tracks future schema changes.
        migrations.AlterModelOptions(
            name="order",
            options={
                "managed": True,
                "ordering": ["-created_at"],
                "verbose_name": "Order",
                "verbose_name_plural": "Orders",
            },
        ),
        # Register the user FK in Django's state only — the column already
        # exists in the DB (created in 0001_initial raw SQL).
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name="order",
                    name="user",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        # New column — real ALTER TABLE.
        migrations.AddField(
            model_name="orderitem",
            name="is_foc",
            field=models.BooleanField(
                default=False,
                help_text="Free of charge order item (no sale)",
            ),
        ),
    ]
