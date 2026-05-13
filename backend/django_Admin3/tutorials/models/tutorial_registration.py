"""TutorialRegistration — session-level enrolment owned by CSV sync.

Written exclusively by the registrations CSV importer (full-sync model).
Soft-deleted via ``is_active=False`` so historical state is preserved for
audit / swap reconciliation. The default manager hides inactive rows; use
``objects_all`` to see everything.

`order_item` is exposed as a derived property — the canonical link is
``tutorial_choice.order_item``. Legacy rows imported in 2026-05-08 may
have ``tutorial_choice=None``; for those rows ``registration.order_item``
returns ``None``.
"""
from django.db import models


class ActiveRegistrationManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class TutorialRegistration(models.Model):
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT,
        related_name='tutorial_registrations',
    )
    tutorial_session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.PROTECT,
        related_name='registrations',
    )
    tutorial_choice = models.ForeignKey(
        'tutorials.TutorialChoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    is_active = models.BooleanField(default=True)
    import_batch = models.ForeignKey(
        'tutorials.TutorialEnrolmentImport', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Default `objects` hides inactive rows; `objects_all` exposes history.
    objects = ActiveRegistrationManager()
    objects_all = models.Manager()

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_registrations"'
        base_manager_name = 'objects_all'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'tutorial_session'],
                condition=models.Q(is_active=True),
                name='uniq_active_reg_per_student_session',
            ),
        ]
        verbose_name = 'Tutorial Registration'
        verbose_name_plural = 'Tutorial Registrations'

    @property
    def order_item(self):
        """Derived from ``tutorial_choice.order_item``.

        Returns None when ``tutorial_choice`` is null (legacy unmatched
        registration). Read-only; callers that need to write must
        traverse through ``tutorial_choice`` directly.
        """
        return self.tutorial_choice.order_item if self.tutorial_choice_id else None

    def __str__(self):
        return f"{self.student} → {self.tutorial_session} (active={self.is_active})"
