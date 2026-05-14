"""Phase 4c: backfill MarkingPaper.marking_template_id from MarkingProduct.

For every MarkingPaper whose `purchasable` is a MarkingProduct (verified
true for 240/240 rows on dev DB 2026-05-14), copy the MarkingProduct's
`marking_template_id` onto the paper. Bulk SQL update keyed on the
shared MTI PK.

Join path:
    marking_paper.purchasable_id
        == marking_products.product_ptr_id
           (MarkingProduct extends Product via MTI; product_ptr_id is the
            shared PK column in the marking_products subclass table)

Idempotent: papers whose marking_template_id is already populated are
left untouched (WHERE mp.marking_template_id IS NULL).

Out-of-scope: papers whose purchasable does NOT resolve to a
MarkingProduct (e.g., the paper points at a MaterialProduct or
GenericItem). Dev-DB audit found zero such rows. If any are found in
production at migration time, they remain with marking_template=NULL
and migration 0021 will fail with IntegrityError — surfacing them
before consumers can rely on the constraint. That "loud failure"
behaviour is intentional.
"""
from django.db import migrations


def backfill_marking_paper_template(apps, schema_editor):
    """Forward: set marking_template_id from MarkingProduct via shared PK.

    Uses a single UPDATE ... FROM ... SQL statement for efficiency,
    matching the size of MarkingProduct (~240 rows on dev) and avoiding
    Python-side row-by-row iteration.

    Join key: marking_paper.purchasable_id == marking_products.product_ptr_id
    (MarkingProduct's MTI parent-pointer column in "acted"."marking_products").
    """
    with schema_editor.connection.cursor() as cur:
        cur.execute(
            'UPDATE "acted"."marking_paper" mp '
            'SET marking_template_id = mprod.marking_template_id '
            'FROM "acted"."marking_products" mprod '
            'WHERE mp.purchasable_id = mprod.product_ptr_id '
            '  AND mp.marking_template_id IS NULL '
            '  AND mprod.marking_template_id IS NOT NULL'
        )
        affected = cur.rowcount
        print(f'  backfill_marking_paper_template: updated={affected} papers')


def reverse_backfill(apps, schema_editor):
    """Reverse: NO-OP. We cannot reliably distinguish backfilled rows
    from manually-set rows. Schema migration 0021 reverse re-allows
    null, so even if data is restored, FK integrity holds.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0019_backfill_marking_templates'),
        ('store', '0018_create_marking_products'),
    ]

    operations = [
        migrations.RunPython(
            backfill_marking_paper_template,
            reverse_code=reverse_backfill,
        ),
    ]
