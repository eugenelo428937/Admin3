"""TutorialProduct — MTI subclass of store.Product for tutorial events.

Tutorial products bypass the catalog (catalog_products /
catalog_product_variations). Instead, each TutorialProduct owns:
  - `tutorial_course_template` FK → tutorials.TutorialCourseTemplate
  - `tutorial_location`        FK → tutorials.TutorialLocation
  - `format` enum (23 real codes matching catalog_product_variations
    where variation_type='Tutorial')

The enum replaces the role of catalog `ProductVariation` rows with
`variation_type='Tutorial'`.

Table: acted.tutorial_products
"""
from django.db import models

from store.models.product import Product


class TutorialProduct(Product):
    """ESS-based tutorial product. Phase 2 backfilled from existing
    Product rows whose PPV variation_type is 'Tutorial'.

    Nullability notes (Phase 2):
      - tutorial_location is NULL for OC (Online Classroom) rows —
        no physical venue.
      - tutorial_course_template is NULL for rows where
        `{subject}_{format}` doesn't match an existing
        TutorialCourseTemplate; operators can backfill later.
    """

    class Format(models.TextChoices):
        # Phase 2 expanded to match the 23 real codes in
        # catalog_product_variations (variation_type='Tutorial').
        # LIVE/REC dropped — no data uses them.

        # Face-to-face
        F2F_1F  = 'F2F_1F',  'Face-to-Face 1 full day'
        F2F_1PD = 'F2F_1PD', 'Face-to-Face Paper B Preparation Day'
        F2F_2F  = 'F2F_2F',  'Face-to-Face 2 full days'
        F2F_3F  = 'F2F_3F',  'Face-to-Face 3 full days'
        F2F_4F  = 'F2F_4F',  'Face-to-Face 4 full days'
        F2F_5B  = 'F2F_5B',  'Face-to-Face 5-day bundle'
        F2F_5F  = 'F2F_5F',  'Face-to-Face 5 full days'
        F2F_6B  = 'F2F_6B',  'Face-to-Face 6-day bundle'
        F2F_6H  = 'F2F_6H',  'Face-to-Face 6 half days'

        # Live online
        LO_10H  = 'LO_10H',  'Live Online 10 half days'
        LO_1F   = 'LO_1F',   'Live Online 1 full day'
        LO_1PD  = 'LO_1PD',  'Live Online Paper B Preparation Day'
        LO_2F   = 'LO_2F',   'Live Online 2 full days'
        LO_2H   = 'LO_2H',   'Live Online 2 half days'
        LO_3F   = 'LO_3F',   'Live Online 3 full days'
        LO_4F   = 'LO_4F',   'Live Online 4 full days'
        LO_4H   = 'LO_4H',   'Live Online 4 half days'
        LO_5B   = 'LO_5B',   'Live Online 5-day bundle'
        LO_5F   = 'LO_5F',   'Live Online 5 full days'
        LO_6B   = 'LO_6B',   'Live Online 6-day bundle'
        LO_6H   = 'LO_6H',   'Live Online 6 half days'
        LO_8H   = 'LO_8H',   'Live Online 8 half days'

        # Online classroom (no physical location — see tutorial_location)
        OC      = 'OC',      'Online Classroom'

    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='store_tutorial_products',
        help_text=(
            'NULL if no matching `{subject}_{format}` template '
            'existed at Phase 2 backfill time. Operators can link '
            'a real template later.'
        ),
    )
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='store_tutorial_products',
        help_text='NULL for OC (Online Classroom) rows — no physical venue.',
    )
    format = models.CharField(max_length=16, choices=Format.choices)

    class Meta:
        db_table = '"acted"."tutorial_products"'
        verbose_name = 'Tutorial Product'
        verbose_name_plural = 'Tutorial Products'
        # See sibling model marking_product.py and the design doc §4.5 — Django MTI
        # raises models.E016 if a child UniqueConstraint references a parent-table
        # field (exam_session_subject lives on Product). Uniqueness is enforced
        # via Purchasable.code UNIQUE (auto-generated product_code includes all
        # four dimensions: subject, location, format, session).
