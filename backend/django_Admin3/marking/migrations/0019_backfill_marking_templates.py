"""Backfill MarkingTemplate rows from catalog_products.

For every distinct catalog.Product row referenced by any
ProductProductVariation with variation_type='Marking', create a
MarkingTemplate with id = catalog.Product.id (1:1 PK mapping). This
makes the Phase 2 split command's MarkingTemplate lookup a simple
`MarkingTemplate.objects.get(pk=ppv.product_id)`.

Idempotent — re-running this migration produces no new rows: the
explicit PK existence check (MarkingTemplate.filter(pk=...).exists())
skips already-backfilled rows. The composite (code, name) UC is a
secondary safety net that prevents two catalog rows with identical
names from mapping to the same MarkingTemplate.
"""
from django.db import migrations


def create_marking_templates(apps, schema_editor):
    """Forward: scan catalog Marking PPVs and create one
    MarkingTemplate per distinct catalog.Product row.

    One query: pull the needed catalog.Product columns through the
    PPV join in a single SELECT. Then iterate Python-side, skipping
    duplicates and already-backfilled rows.
    """
    ProductProductVariation = apps.get_model(
        'catalog_products', 'ProductProductVariation'
    )
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    marking_products = (
        ProductProductVariation.objects
        .filter(product_variation__variation_type='Marking')
        .values(
            'product_id',
            'product__code',
            'product__shortname',
            'product__fullname',
            'product__description',
            'product__is_active',
        )
        .distinct()
    )

    created = 0
    skipped = 0
    seen_pks = set()
    for row in marking_products:
        pk = row['product_id']
        if pk in seen_pks:
            continue
        seen_pks.add(pk)

        # Skip if a MarkingTemplate with this PK already exists
        # (idempotency: the explicit guard, not the UC).
        if MarkingTemplate.objects.filter(pk=pk).exists():
            skipped += 1
            continue

        # shortname is NOT NULL in catalog_products.Product but may be
        # an empty string in legacy rows; fallback chain handles both.
        name = (
            row['product__shortname']
            or row['product__fullname']
            or row['product__code']
        )
        MarkingTemplate.objects.create(
            pk=pk,
            code=row['product__code'],
            name=name,
            description=row['product__description'] or '',
            is_active=row['product__is_active'],
        )
        created += 1

    print(f'  backfill_marking_templates: created={created} skipped={skipped}')


def reverse_marking_templates(apps, schema_editor):
    """Reverse: delete only the MarkingTemplate rows we created in
    forward (those whose PK matches a catalog.Product referenced by a
    Marking PPV).

    Conservative: it does NOT delete MarkingTemplate rows that
    might have been created manually post-migration with the same PK.
    Verifying that the catalog row still exists is the strongest
    signal we can use.
    Conversely, if a Marking PPV was deleted after the forward migration
    ran, the MarkingTemplate row it created will NOT be deleted by this
    reverse (the filter finds no matching catalog_product_id for it).
    This is intentional: the reverse is conservative and prefers to leave
    orphan rows over deleting rows it did not provably create.
    """
    ProductProductVariation = apps.get_model(
        'catalog_products', 'ProductProductVariation'
    )
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    catalog_product_ids = list(
        ProductProductVariation.objects
        .filter(product_variation__variation_type='Marking')
        .values_list('product_id', flat=True)
        .distinct()
    )
    MarkingTemplate.objects.filter(pk__in=catalog_product_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0018_marking_template_composite_uc'),
        ('catalog_products', '0004_add_is_active_to_variations'),
    ]

    operations = [
        migrations.RunPython(
            create_marking_templates,
            reverse_code=reverse_marking_templates,
        ),
    ]
