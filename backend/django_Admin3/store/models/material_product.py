"""MaterialProduct — MTI subclass of store.Product for material items.

Materials (eBook, Printed, Hub) are the only product family that uses
the `catalog_products` template + variation structure. Tutorial and
Marking products have their own subclasses that bypass the catalog.

**Phase 5 Task 3 (DB-only additive migrations):**
Migrations 0021–0023 add `product_product_variation_id` to the
`acted.material_products` table at the DB level and backfill the
column values from the parent Product row. A BEFORE INSERT trigger
(installed by migration 0023) auto-populates the column from the parent
`products` table so the NOT NULL constraint is satisfied for all ORM
inserts without requiring a Python field declaration here. The trigger
is dropped in Task 4's migration once the Python field takes over.

The Python model field declaration is deferred to Task 4, when the
parent Product removes the same-named field (Django MTI prohibits a
subclass from redeclaring a field that already exists on the parent).

**Phase 1 status — empty marker.** MaterialProduct ships in Phase 1 as
an MTI subclass with no local fields of its own. The
`product_product_variation` FK stays on the `Product` parent through
Phases 1–4 because Django MTI forbids a subclass redeclaring a parent's
field. Phase 5 moves the FK from Product to MaterialProduct via a
`RemoveField + AddField` migration with data backfill — at which point
this class gains its `product_product_variation` field.

Phase 1's role for MaterialProduct is purely to create the
`acted.material_products` table so Phase 2 backfill has a destination.

Table: acted.material_products
"""
from store.models.product import Product


class MaterialProduct(Product):
    """ESS-based material product (eBook/Printed/Hub).

    Phase 1: empty marker subclass. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    one of {'eBook', 'Printed', 'Hub'}. Each backfilled row shares its
    PK with the parent Product row (MTI shared PK). The PPV value
    remains on the `Product` parent for the row.

    Phase 5 Task 3: migrations 0021-0023 add and backfill the
    `product_product_variation_id` column at the DB level only. A
    BEFORE INSERT trigger auto-populates the column from the parent
    `products` row on every ORM insert. NOT NULL is enforced at the DB
    level. The Python field declaration is deferred to Task 4.
    """

    class Meta:
        db_table = '"acted"."material_products"'
        verbose_name = 'Material Product'
        verbose_name_plural = 'Material Products'

    def save(self, *args, **kwargs):
        """Phase 5: MaterialProduct sets kind='material' explicitly.

        The BEFORE INSERT trigger installed by migration 0023 automatically
        copies product_product_variation_id from the parent products row into
        this subclass table on every INSERT, satisfying the NOT NULL constraint
        without needing the Python field to be declared here.

        Code generation stays in Product.save() until migration 0024
        removes product_product_variation from the parent — then it
        moves here too.
        """
        if not self.kind:
            self.kind = self.Kind.MATERIAL  # 'material'
        super().save(*args, **kwargs)
