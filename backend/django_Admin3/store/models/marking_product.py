"""MarkingProduct — MTI subclass of store.Product for marking series.

Marking products are always delivered electronically — there is no
'printed marking' variation. The variation choice that exists in
`catalog_product_variations` for marking is structurally pointless.
MarkingProduct bypasses the catalog and links directly to a
`marking.MarkingTemplate` (the series-level concept).

Table: acted.marking_products
"""
from django.db import models

from store.models.product import Product


class MarkingProduct(Product):
    """ESS-based marking product.

    Phase 1: empty table. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    'Marking'. Each backfilled row shares its PK with the parent
    Product row (MTI shared PK).
    """

    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='store_marking_products',
        help_text='The marking series template this product realizes.',
    )
    paper_count = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text=(
            'Number of papers in this series. Optional — can be derived '
            'from MarkingPaper rows attached to this template.'
        ),
    )

    class Meta:
        db_table = '"acted"."marking_products"'
        verbose_name = 'Marking Product'
        verbose_name_plural = 'Marking Products'
        # Note: cross-(marking_template, ESS) uniqueness cannot be expressed
        # as a Django UniqueConstraint here — Django MTI raises models.E016
        # if Meta.constraints references parent-table fields
        # (exam_session_subject lives on Product). Uniqueness is instead
        # enforced via Purchasable.code UNIQUE: MarkingProduct's auto-
        # generated product_code includes the marking template code and
        # exam session code, so two rows with the same (template, ESS)
        # tuple cannot share a Purchasable.code. A proper cross-table
        # partial unique index via RunSQL can be added in a later phase
        # if explicit DB-level enforcement is desired. (Same pattern as
        # TutorialProduct — see store/models/tutorial_product.py.)

    def save(self, *args, **kwargs):
        """Phase 5: MarkingProduct sets kind='marking' explicitly and
        generates product_code from subclass fields. No PPV dependency."""
        if not self.kind:
            self.kind = self.Kind.MARKING  # 'marking'
        if not self.product_code:
            self.product_code = self._generate_marking_product_code()
            self.code = self.product_code
        super().save(*args, **kwargs)

    def _generate_marking_product_code(self):
        """Generate Marking product code: {subject}/{template_code}/{session}."""
        ess = self.exam_session_subject
        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        template_code = self.marking_template.code
        return f"{subject_code}/{template_code}/{exam_code}"
