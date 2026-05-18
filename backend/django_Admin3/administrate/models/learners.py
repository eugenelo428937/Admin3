"""adm.learners: thin bridge for the session+learner webhook expansion
(2026-05-18).

Domain cardinality (important — drove the design):
  - Administrate's `Learner` represents one enrolment in one Event.
    An Event has N Sessions; the Learner therefore corresponds to N
    of our session-level rows.
  - Our `tutorials.TutorialRegistration` is per-Session. One Administrate
    Learner therefore maps to N TutorialRegistration rows.

To preserve "one bridge row per acted row" (Option α, 2026-05-18), the
`adm.Learner` table holds one row per (Administrate-learner, our-
registration) pair. `external_id` is indexed but NOT unique alone;
uniqueness is enforced by the composite constraint
`(external_id, tutorial_registration)`.

Note: an earlier draft of this PR also added an `adm.learner_attendance`
bridge for the `Learner Attended Session` webhook flow. That flow was
removed: attendance is written into `tutorials.TutorialAttendance` via
the existing CSV import and public-attendance views; there's no need
to mirror attendance state on the Administrate side.
"""
from django.db import models


class Learner(models.Model):

    # Administrate's `Learner` id. NOT unique alone — see module
    # docstring for cardinality rationale. Indexed so the "find all
    # bridge rows for this Administrate learner" query (used by Learner
    # Cancelled) stays cheap.
    external_id = models.CharField(max_length=50, db_index=True)

    # The session-level enrolment row this bridge represents. SET_NULL
    # on delete so the bridge survives the master being removed (audit
    # history). Cross-schema FK (adm -> acted), handled natively by
    # PostgreSQL.
    tutorial_registration = models.ForeignKey(
        'tutorials.TutorialRegistration',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_learners',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."learners"'
        ordering = ['external_id']
        verbose_name = 'Administrate Learner Bridge'
        verbose_name_plural = 'Administrate Learner Bridges'
        constraints = [
            # One bridge row per (Administrate learner, our registration)
            # pair. The pair is the natural unique key — same learner_id
            # can appear N times (once per session in the event) but
            # only once per (learner, registration) combination.
            models.UniqueConstraint(
                fields=['external_id', 'tutorial_registration'],
                name='uniq_learner_per_registration',
            ),
        ]

    def __str__(self):
        if self.tutorial_registration_id:
            return (
                f"adm.Learner[{self.external_id}] -> "
                f"TutorialRegistration#{self.tutorial_registration_id}"
            )
        return f"adm.Learner[{self.external_id}] (unlinked)"
