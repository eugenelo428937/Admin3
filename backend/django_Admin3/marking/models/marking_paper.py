"""
MarkingPaper model.

Updated 2026-01-27: Changed FK from catalog.ExamSessionSubjectProduct to
store.Product as part of schema migration to acted schema.

Updated 2026-04-29 (Phase A5): Renamed FK from `store_product` to
`purchasable` and retargeted at `store.Purchasable` (the MTI parent of
`store.Product`). Existing rows are preserved because every
`store.Product.id` value is also a valid `store.Purchasable.id`
(shared PK via `purchasable_ptr_id`). Added `is_active` and `sequences`
fields.

Updated 2026-05-14 (Phase 4c): `marking_template` made NOT NULL after
the data backfill migration (0020) populated all 240 rows. Every paper
now belongs to a marking series.
"""
from django.db import models


class MarkingPaper(models.Model):
    """
    Marking paper with deadline information.

    Links to a ``store.Purchasable`` to identify which purchasable item
    (Product, MarkingVoucher, etc.) this marking paper belongs to.

    **Backward Compatibility**:
    The `exam_session_subject_product` property provides compatibility
    with code that still expects the old ESSP reference; it only returns
    a value when the linked purchasable is a ``store.Product``.
    """
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='marking_papers',
        null=True,
        blank=True,
        help_text='The purchasable this marking paper belongs to',
    )
    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='marking_papers',
        help_text=(
            'The marking series this paper belongs to. Required as of '
            'Phase 4c; backfilled by migration 0020 from MarkingProduct.'
        ),
    )
    name = models.CharField(max_length=10)
    deadline = models.DateTimeField()
    recommended_submit_date = models.DateTimeField()
    is_active = models.BooleanField(default=True, db_index=True)
    sequences = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text=(
            'Sequence number within the named paper '
            '(e.g., X-1, X-2, M2-1, M2-2).'
        ),
    )

    class Meta:
        db_table = '"acted"."marking_paper"'

    # ─────────────────────────────────────────────────────────────────────────
    # Backward-compatible properties for ESSP access
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def exam_session_subject_product(self):
        """Backward-compatible accessor returning a legacy
        ExamSessionSubjectProduct (ESSP) for the linked store.Product.

        Phase 5 Task 4b: PPV moved off Product onto MaterialProduct.
        For Material rows we still look up via the (now-on-subclass) PPV
        chain. For Marking rows the PPV is gone — the catalog template is
        instead reachable via ``markingproduct.marking_template`` (whose
        pk equals the original catalog.Product.pk per the Phase 3.1
        backfill). For Tutorial rows there is no catalog link, so this
        returns None.
        """
        from catalog.models import ExamSessionSubjectProduct
        from store.models import Product as StoreProduct
        if not self.purchasable_id:
            return None
        try:
            store_product = StoreProduct.objects.get(pk=self.purchasable_id)
        except StoreProduct.DoesNotExist:
            return None

        catalog_product_id = None
        # Material rows: PPV chain on the subclass.
        ppv = store_product.product_product_variation
        if ppv is not None:
            catalog_product_id = ppv.product_id
        else:
            # Marking rows: marking_template.pk == catalog.Product.pk.
            marking_subclass = getattr(store_product, 'markingproduct', None)
            if marking_subclass is not None:
                catalog_product_id = marking_subclass.marking_template_id

        if catalog_product_id is None:
            return None
        return ExamSessionSubjectProduct.objects.filter(
            exam_session_subject=store_product.exam_session_subject,
            product_id=catalog_product_id,
        ).first()

    def __str__(self):
        if self.purchasable_id is None:
            return f"{self.name} (no purchasable)"
        label = getattr(self.purchasable, 'code', None) or self.purchasable_id
        return f"{self.name} ({label})"
