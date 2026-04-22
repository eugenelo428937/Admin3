"""Create one Purchasable row per existing store.Product, preserving the PK.

This lets us convert Product to an MTI subclass (Task 7) with
Product.id == Purchasable.id, so cart/order FKs pointing at Product.id still
resolve after the flip.
"""
from django.db import migrations


def backfill_purchasables_from_products(apps, schema_editor):
    Product = apps.get_model('store', 'Product')
    Purchasable = apps.get_model('store', 'Purchasable')

    rows = []
    for product in Product.objects.select_related(
        'product_product_variation__product'
    ).iterator(chunk_size=500):
        ppv = product.product_product_variation
        catalog_product = ppv.product
        # catalog.Product has fullname (display) and shortname (compact);
        # prefer fullname, fall back to shortname, then product_code.
        name = (
            getattr(catalog_product, 'fullname', None)
            or getattr(catalog_product, 'shortname', None)
            or product.product_code
        )
        rows.append(Purchasable(
            id=product.id,                    # preserve PK for MTI + FK stability
            kind='product',
            code=product.product_code,
            name=name,
            description='',
            is_active=product.is_active,
            dynamic_pricing=False,
            vat_classification='',
            created_at=product.created_at,
            updated_at=product.updated_at,
        ))
    if rows:
        Purchasable.objects.bulk_create(rows, batch_size=500)


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(kind='product').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0006_price_add_purchasable_fk'),
        # Required: catalog_products.0002_initial introduces the
        # ProductProductVariation.product FK via SeparateDatabaseAndState.
        # Without this explicit dep, Django's test-DB build can order
        # catalog_products.0002 after this migration, and the
        # select_related('product_product_variation__product') call below
        # fails with FieldError.
        ('catalog_products', '0002_initial'),
    ]
    operations = [
        migrations.RunPython(backfill_purchasables_from_products, reverse),
    ]
