"""
Tutorial Event model.

Updated 2026-01-16: Migrated FK from ExamSessionSubjectProductVariation
to store.Product as part of T087 legacy app cleanup.
Updated 2026-05-14: Phase 4b retarget FK from store.Product to
store.TutorialProduct (MTI shared PK — no data migration needed).
Updated 2026-05-15 (Phase 1): Added Administrate-derived fields so
acted.tutorial_events can be the master and adm.events shrinks to a
bridge. Plan: docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md
"""
from django.db import models
from store.models import TutorialProduct

class TutorialEvents(models.Model):
    """
    Simplified Tutorial Event model.

    Links to store.Product for the purchasable tutorial product variation.
    """
    code = models.CharField(max_length=100, unique=True)
    venue = models.ForeignKey(
        'tutorials.TutorialVenue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    is_soldout = models.BooleanField(default=False)
    cancelled = models.BooleanField(
        default=False,
        help_text=(
            "True for stub events that were referenced by orders but never ran "
            "(or were cancelled after orders were placed). Excluded from "
            "registration / attendance flows; kept so historical TutorialChoice "
            "rows have a valid FK target."
        ),
    )
    # Phase 5b (2026-05-16): finalisation_date converted from Date to
    # DateTime to match lms_start_date / lms_end_date. Existing data
    # backfilled to midnight Europe/London by the migration.
    finalisation_date = models.DateTimeField(null=True, blank=True)
    remain_space = models.IntegerField(default=0)
    # `start_date` / `end_date` (Date) were dropped in Phase 5b — readers
    # use `lms_start_date` / `lms_end_date` (DateTime, defined below).
    main_instructor = models.ForeignKey(
        'tutorials.TutorialInstructor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tutorial_events',
    )
    store_product = models.ForeignKey(
        TutorialProduct,
        on_delete=models.CASCADE,
        related_name='tutorial_events',
        db_column='product_id',
        help_text=(
            'Phase 4b retarget: was store.Product, now store.TutorialProduct. '
            'The PK column (product_id) is unchanged — MTI shared PK means '
            'every TutorialProduct.pk equals its parent Product.pk, so all '
            'existing FK values still resolve.'
        ),
    )

    # ---- Administrate-derived fields (Phase 1, additive) -------------------
    # Filled by webhook (Phase 2+) and the data backfill command (Phase 3).
    # All nullable so the migration applies on existing legacy rows that
    # have never been linked to Administrate.
    external_id = models.CharField(
        max_length=64, null=True, blank=True, unique=True,
        help_text='Administrate event id (Relay base64). Unique join key '
                  'between adm.events.external_id and acted.tutorial_events.',
    )
    lifecycle_state = models.CharField(max_length=20, null=True, blank=True)
    learning_mode = models.CharField(max_length=20, null=True, blank=True)
    tutorial_category = models.CharField(max_length=20, null=True, blank=True)
    web_sale = models.BooleanField(null=True)
    # Mirrors `is_soldout` from the Administrate side. Phase 5 will likely
    # collapse the two into one column; keeping both for now lets legacy
    # readers and the new webhook handler coexist.
    sold_out = models.BooleanField(null=True)
    max_places = models.PositiveIntegerField(null=True, blank=True)
    min_places = models.PositiveIntegerField(null=True, blank=True)
    # DateTime equivalents — replace start_date / end_date in Phase 5.
    lms_start_date = models.DateTimeField(null=True, blank=True)
    lms_end_date = models.DateTimeField(null=True, blank=True)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    event_url = models.URLField(max_length=500, null=True, blank=True)
    virtual_classroom = models.CharField(max_length=255, null=True, blank=True)
    timezone = models.CharField(max_length=50, null=True, blank=True)
    sitting = models.CharField(max_length=50, null=True, blank=True)
    administrator = models.CharField(max_length=255, null=True, blank=True)
    session_title = models.CharField(max_length=255, null=True, blank=True)
    ocr_moodle_code = models.CharField(max_length=100, null=True, blank=True)
    sage_code = models.CharField(max_length=100, null=True, blank=True)
    recordings = models.BooleanField(null=True)
    recording_pin = models.CharField(max_length=50, null=True, blank=True)
    extra_information = models.TextField(null=True, blank=True)
    tutors = models.CharField(max_length=255, null=True, blank=True)
    access_duration = models.CharField(max_length=100, null=True, blank=True)
    # Cross-schema FK: acted -> adm. PostgreSQL handles cross-schema FK
    # constraints natively; Django emits the constraint via db_constraint=True
    # (the default). The dependency direction now goes acted -> adm, so the
    # `tutorials` app implicitly requires `administrate` to be migrated first;
    # `tutorials/apps.py` doesn't need an explicit dependency declaration
    # because the migration's `dependencies = [...]` covers that.
    course_template = models.ForeignKey(
        'administrate.CourseTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tutorial_events',
    )
    # ------------------------------------------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_events"'
        ordering = ['lms_start_date', 'code']
        verbose_name = 'Tutorial Event'
        verbose_name_plural = 'Tutorial Events'

    @property
    def instructors(self):
        """Aggregate instructors from all sessions for this event."""
        from tutorials.models import TutorialInstructor
        return TutorialInstructor.objects.filter(
            sessions__tutorial_event=self
        ).distinct()

    @property
    def subject_code(self):
        """Get subject code through store.Product relationship"""
        return self.store_product.exam_session_subject.subject.code

    # Backward compatibility property
    @property
    def exam_session_subject_product_variation(self):
        """Backward compatibility: returns store_product (same FK target IDs)"""
        return self.store_product

    def __str__(self):
        venue_name = str(self.venue) if self.venue else 'No Venue'
        return f"{self.code} - {venue_name}"
