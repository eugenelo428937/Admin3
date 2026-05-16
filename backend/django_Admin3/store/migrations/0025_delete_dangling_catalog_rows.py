"""Phase 5: delete dangling catalog rows that no store.Product references.

After migration 0024 removed Product.product_product_variation,
Tutorial and Marking ProductProductVariations have no incoming
store-side FK. ProductVariation rows with variation_type='Tutorial'
or 'Marking' likewise have no remaining consumer. Catalog Product
rows whose `code` matches a MarkingTemplate code exist only as
templates for the now-defunct marking PPV chain.

Order matters: delete PPVs first (they FK to ProductVariation and
catalog.Product), then ProductVariations, then the marking-template
catalog Products.

Idempotent: filters on data values, not migration state.
"""
from django.db import migrations


def delete_dangling_catalog_rows(apps, schema_editor):
    ProductProductVariation = apps.get_model('catalog_products', 'ProductProductVariation')
    ProductVariation = apps.get_model('catalog_products', 'ProductVariation')
    CatProd = apps.get_model('catalog_products', 'Product')
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    # 1. Delete Tutorial + Marking PPVs (they FK to ProductVariation).
    deleted_ppvs, _ = ProductProductVariation.objects.filter(
        product_variation__variation_type__in=['Tutorial', 'Marking'],
    ).delete()
    print(f'  Deleted PPVs (Tutorial+Marking): {deleted_ppvs}')

    # 2. Delete Tutorial + Marking ProductVariations.
    deleted_vars, _ = ProductVariation.objects.filter(
        variation_type__in=['Tutorial', 'Marking'],
    ).delete()
    print(f'  Deleted ProductVariations (Tutorial+Marking): {deleted_vars}')

    # 3. Delete catalog Products matching MarkingTemplate.code.
    mt_codes = list(MarkingTemplate.objects.values_list('code', flat=True))
    deleted_prods, _ = CatProd.objects.filter(code__in=mt_codes).delete()
    print(f'  Deleted catalog Products matching MarkingTemplate.code: {deleted_prods}')


def reverse_deletion(apps, schema_editor):
    """Reverse: NO-OP. We cannot reconstruct the deleted rows from
    surviving state. If a rollback is needed, restore from DB backup.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0024_remove_product_ppv'),
    ]

    operations = [
        migrations.RunPython(
            delete_dangling_catalog_rows,
            reverse_code=reverse_deletion,
        ),
    ]
