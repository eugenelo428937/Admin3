# Custom migration: move cart tables into 'acted' schema and remove prefix

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0002_remove_actedorder_user_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterModelTable(
                    name="cart",
                    table='"acted"."carts"',
                ),
                migrations.AlterModelTable(
                    name="cartfee",
                    table='"acted"."cart_fees"',
                ),
                migrations.AlterModelTable(
                    name="cartitem",
                    table='"acted"."cart_items"',
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "public"."acted_carts" SET SCHEMA "acted";',
                        'ALTER TABLE "acted"."acted_carts" RENAME TO "carts";',
                        'ALTER TABLE "public"."acted_cart_items" SET SCHEMA "acted";',
                        'ALTER TABLE "acted"."acted_cart_items" RENAME TO "cart_items";',
                        'ALTER TABLE "public"."acted_cart_fees" SET SCHEMA "acted";',
                        'ALTER TABLE "acted"."acted_cart_fees" RENAME TO "cart_fees";',
                    ],
                    reverse_sql=[
                        'ALTER TABLE "acted"."carts" RENAME TO "acted_carts";',
                        'ALTER TABLE "acted"."acted_carts" SET SCHEMA "public";',
                        'ALTER TABLE "acted"."cart_items" RENAME TO "acted_cart_items";',
                        'ALTER TABLE "acted"."acted_cart_items" SET SCHEMA "public";',
                        'ALTER TABLE "acted"."cart_fees" RENAME TO "acted_cart_fees";',
                        'ALTER TABLE "acted"."acted_cart_fees" SET SCHEMA "public";',
                    ],
                ),
            ],
        ),
    ]
