"""TutorialProduct — MTI subclass of store.Product for tutorial events.

Tutorial products bypass the catalog (catalog_products /
catalog_product_variations). Instead, each TutorialProduct owns:
  - `tutorial_course_template` FK → tutorials.TutorialCourseTemplate
  - `tutorial_location`        FK → tutorials.TutorialLocation
  - `format` enum (F2F 1-day / 3-day / 5-day, Live Online, Recorded)

The enum replaces the role of catalog `ProductVariation` rows with
`variation_type='Tutorial'`.

Table: acted.tutorial_products
"""
from django.db import models

from store.models.product import Product


class TutorialProduct(Product):
    """ESS-based tutorial product.

    Phase 1: empty table. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    'Tutorial' or any tutorial-format equivalent. Each backfilled row
    shares its PK with the parent Product row (MTI shared PK).
    """

    class Format(models.TextChoices):
        # Initial set — Phase 2 backfill expands if it finds legacy values
        # that don't map cleanly. The Phase 2 plan's `--check` mode will
        # surface those.
        F2F_1DAY    = 'F2F_1F', 'Face-to-Face 1-day'
        F2F_3DAY    = 'F2F_3F', 'Face-to-Face 3-day'
        F2F_5DAY    = 'F2F_5F', 'Face-to-Face 5-day'
        LIVE_ONLINE = 'LIVE',   'Live Online'
        RECORDED    = 'REC',    'Recorded'

    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.PROTECT,
        related_name='store_tutorial_products',
    )
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.PROTECT,
        related_name='store_tutorial_products',
    )
    format = models.CharField(max_length=16, choices=Format.choices)

    class Meta:
        db_table = '"acted"."tutorial_products"'
        verbose_name = 'Tutorial Product'
        verbose_name_plural = 'Tutorial Products'
        # Note: cross-(template, location, format, ESS) uniqueness cannot be
        # expressed as a Django UniqueConstraint here — Django MTI raises
        # models.E016 if Meta.constraints references parent-table fields
        # (exam_session_subject lives on Product). Uniqueness is instead
        # enforced via Purchasable.code UNIQUE: TutorialProduct's auto-
        # generated product_code includes all four dimensions
        # (subject/location/format/session), so two rows with the same
        # dimensional tuple cannot share a Purchasable.code. A proper
        # cross-table partial unique index via RunSQL can be added in a
        # later phase if explicit DB-level enforcement is desired.
