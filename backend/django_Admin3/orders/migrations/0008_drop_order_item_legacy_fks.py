# Task 23 (Release B): drop legacy product / marking_voucher / item_type
# columns from acted.order_items.
#
# After the merge with main on 2026-04-22, OrderItem is now `managed=True`
# and orders.0003_alter_orderitem_options (state-only) registered `product`,
# `marking_voucher`, the 2 CHECK constraints, and `item_type` already was
# in state via 0002_initial. So state_operations must now remove:
#   - both CHECK constraints (registered in state by 0003_alter_orderitem_options)
#   - product and marking_voucher FKs (registered in state by 0003_alter_orderitem_options)
#   - item_type (registered in state by 0002_initial)
#
# Database-wise (all pre-exist from the original 0001_initial raw SQL):
#   - CHECK constraints order_item_has_product_or_voucher_or_is_fee and
#     order_item_not_both_product_and_voucher
#   - FK constraints order_items_product_id_fk, order_items_marking_voucher_id_fk
#   - columns product_id, marking_voucher_id, item_type

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0007_order_item_purchasable_not_null"),
        ("cart", "0007_drop_cart_item_legacy_fks"),
        ("store", "0013_drop_price_product_fk"),
    ]

    operations = [
        # Drop the temp backfill table created by store.0008. All migrations
        # that consumed it (cart.0005, orders.0005, store.0011) have run by
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
                migrations.RemoveConstraint(
                    model_name="orderitem",
                    name="order_item_has_product_or_voucher_or_is_fee",
                ),
                migrations.RemoveConstraint(
                    model_name="orderitem",
                    name="order_item_not_both_product_and_voucher",
                ),
                migrations.RemoveField(
                    model_name="orderitem",
                    name="product",
                ),
                migrations.RemoveField(
                    model_name="orderitem",
                    name="marking_voucher",
                ),
                migrations.RemoveField(
                    model_name="orderitem",
                    name="item_type",
                ),
            ],
        ),
    ]
