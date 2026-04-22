# Task 23 (Release B): drop legacy product / marking_voucher / item_type
# columns from acted.order_items.
#
# OrderItem.Meta.managed = False so we hand-write the DDL via RunSQL and
# mirror it in Django state via state_operations (same pattern as
# 0003/0006). Drops:
#   - CHECK constraints order_item_has_product_or_voucher_or_is_fee and
#     order_item_not_both_product_and_voucher
#   - FK constraints order_items_product_id_fk, order_items_marking_voucher_id_fk
#   - columns product_id, marking_voucher_id, item_type
#
# State-level note: on this unmanaged model, `product` and
# `marking_voucher` were never added to Django's model state (they existed
# only on the Python class and in the database). The migration-time state
# knows only the fields emitted by 0002_initial — of which `item_type` is
# the only one we are dropping now — so state_operations removes just
# that. CHECK/FK constraints were also created via raw SQL in 0001/0003
# and were never added to state, so no RemoveConstraint ops are needed.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_order_item_purchasable_not_null"),
        ("cart", "0007_drop_cart_item_legacy_fks"),
        ("store", "0013_drop_price_product_fk"),
    ]

    operations = [
        # Drop the temp backfill table created by store.0008. All migrations
        # that consumed it (cart.0005, orders.0004, store.0011) have run by
        # the time this migration applies, thanks to the dependency edges
        # above.
        migrations.RunSQL(
            sql='DROP TABLE IF EXISTS acted._voucher_migration_map;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "acted"."order_items" '
                        'DROP CONSTRAINT IF EXISTS order_item_has_product_or_voucher_or_is_fee;',
                        'ALTER TABLE "acted"."order_items" '
                        'DROP CONSTRAINT IF EXISTS order_item_not_both_product_and_voucher;',
                        'ALTER TABLE "acted"."order_items" '
                        'DROP CONSTRAINT IF EXISTS order_items_product_id_fk;',
                        'ALTER TABLE "acted"."order_items" '
                        'DROP CONSTRAINT IF EXISTS order_items_marking_voucher_id_fk;',
                        'DROP INDEX IF EXISTS "acted"."order_items_product_id_idx";',
                        'DROP INDEX IF EXISTS "acted"."order_items_voucher_id_idx";',
                        'ALTER TABLE "acted"."order_items" DROP COLUMN IF EXISTS product_id;',
                        'ALTER TABLE "acted"."order_items" DROP COLUMN IF EXISTS marking_voucher_id;',
                        'ALTER TABLE "acted"."order_items" DROP COLUMN IF EXISTS item_type;',
                    ],
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name="orderitem",
                    name="item_type",
                ),
            ],
        ),
    ]
