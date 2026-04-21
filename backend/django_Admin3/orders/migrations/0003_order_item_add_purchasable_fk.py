# Task 10: Add nullable purchasable FK to OrderItem and relax the
# existing "has product / voucher / fee" check constraint to also accept
# rows that reference a store.Purchasable.
#
# OrderItem is declared with managed=False, so its schema is maintained
# via raw SQL in orders.0001_initial. We do the same here: the Django
# autodetector does not emit operations for unmanaged models, so we
# hand-write the DDL and pair it with state_operations that mirror the
# change in Django's in-memory model state.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_initial"),
        # Minimum required ancestor: store.Purchasable is created in
        # store.0004_create_purchasable. Pinning here (rather than to a
        # later store migration like 0011) keeps the dependency graph
        # flexible — matches the pattern used by
        # cart.0004_cart_item_add_purchasable_fk.
        ("store", "0004_create_purchasable"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # 1. Add nullable purchasable_id column.
                '''ALTER TABLE "acted"."order_items"
                    ADD COLUMN IF NOT EXISTS "purchasable_id" bigint NULL''',

                # 2. Add FK with ON DELETE RESTRICT (Django PROTECT).
                '''ALTER TABLE "acted"."order_items"
                    ADD CONSTRAINT "order_items_purchasable_id_fk"
                    FOREIGN KEY ("purchasable_id")
                    REFERENCES "acted"."purchasables" ("id")
                    ON DELETE RESTRICT
                    DEFERRABLE INITIALLY DEFERRED''',

                # 3. Index for FK lookups.
                '''CREATE INDEX IF NOT EXISTS "order_items_purchasable_id_idx"
                    ON "acted"."order_items" ("purchasable_id")''',

                # 4. Relax the existing CHECK constraint to accept the new FK
                # as a fourth alternative. Drop and recreate under the same name.
                '''ALTER TABLE "acted"."order_items"
                    DROP CONSTRAINT IF EXISTS "order_item_has_product_or_voucher_or_is_fee"''',

                '''ALTER TABLE "acted"."order_items"
                    ADD CONSTRAINT "order_item_has_product_or_voucher_or_is_fee"
                    CHECK (
                        "product_id" IS NOT NULL
                        OR "marking_voucher_id" IS NOT NULL
                        OR "purchasable_id" IS NOT NULL
                        OR "item_type" = 'fee'
                    )''',
            ],
            reverse_sql=[
                # Reverse order: restore strict check, drop index/FK/column.
                '''ALTER TABLE "acted"."order_items"
                    DROP CONSTRAINT IF EXISTS "order_item_has_product_or_voucher_or_is_fee"''',

                '''ALTER TABLE "acted"."order_items"
                    ADD CONSTRAINT "order_item_has_product_or_voucher_or_is_fee"
                    CHECK (
                        "product_id" IS NOT NULL
                        OR "marking_voucher_id" IS NOT NULL
                        OR "item_type" = 'fee'
                    )''',

                'DROP INDEX IF EXISTS "acted"."order_items_purchasable_id_idx"',

                '''ALTER TABLE "acted"."order_items"
                    DROP CONSTRAINT IF EXISTS "order_items_purchasable_id_fk"''',

                '''ALTER TABLE "acted"."order_items"
                    DROP COLUMN IF EXISTS "purchasable_id"''',
            ],
            # Mirror the change in Django's model state so future
            # autodetector runs see the purchasable FK as already present.
            state_operations=[
                migrations.AddField(
                    model_name="orderitem",
                    name="purchasable",
                    field=models.ForeignKey(
                        blank=True,
                        help_text=(
                            "The catalog entity being purchased. "
                            "Non-null in Release B."
                        ),
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="order_items_by_purchasable",
                        to="store.purchasable",
                    ),
                ),
            ],
        ),
    ]
