"""State-only catch-up: register OrderItem.order FK with Django's migration state.

Context: orders.0002_initial emitted `CreateModel(OrderItem, ...)` while the
model had `Meta.managed=False`, and the generator skipped the `order` FK from
the state fields list (the DB column was owned by hand-written 0001_initial
RunSQL). Every subsequent migration that touched OrderItem used
`SeparateDatabaseAndState` with explicit `state_operations` that only
declared the fields being changed at that moment — so `order` remained
invisible to Django's state tracker.

When `Meta.managed` was flipped to `True` in 0008_alter_orderitem_managed_true,
Django started comparing the full Python model class against migration state
and discovered `order` was missing. Running `makemigrations` attempted to
emit `AddField(order, non-nullable)` — which would have tried to add the
column with a default value to an existing populated DB.

The DB column already exists and has always been populated. This migration
does nothing at the DB level; it only tells Django's state "yes, this field
has been here all along." After this, `makemigrations --dry-run` reports
clean and future OrderItem schema changes can be plain Django migrations.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_alter_orderitem_managed_true"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name="orderitem",
                    name="order",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="orders.order",
                    ),
                ),
            ],
        ),
    ]
