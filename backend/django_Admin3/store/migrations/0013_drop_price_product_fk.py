# Task 23 (Release B): drop the legacy Price.product FK column.
#
# The `product_id` column on acted.prices has been replaced by the unified
# `purchasable_id` FK (populated in Task 11 backfill, made NOT NULL +
# UNIQUE(purchasable, price_type) in Task 22). Release B removes the
# legacy column and its FK constraint.
#
# Also drops the temp table acted._voucher_migration_map that was used by
# the Task 11/12 backfill and is no longer needed.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0012_price_purchasable_not_null_plus_unique"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="price",
            name="product",
        ),
    ]
